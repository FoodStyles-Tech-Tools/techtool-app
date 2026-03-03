import { NextRequest, NextResponse } from "next/server"
import { requirePermission, getSupabaseWithUserContext } from "@/lib/auth-helpers"

export const runtime = "nodejs"

const TICKET_LINK_REGEX = /(?:https?:\/\/techtool-app\.vercel\.app)?\/tickets\/([a-z]{2,}-\d+)\b/gi

function extractMentionedTicketSlugs(input: string): string[] {
  const slugs = new Set<string>()
  if (!input) return []

  const regex = new RegExp(TICKET_LINK_REGEX.source, TICKET_LINK_REGEX.flags)
  let match: RegExpExecArray | null
  while ((match = regex.exec(input)) !== null) {
    const slug = String(match[1] || "").toLowerCase()
    if (slug) slugs.add(slug)
  }
  return Array.from(slugs)
}

/** GET /api/tickets/[id]/detail – ticket + comments in one response for the detail dialog */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("tickets", "view")
    const { supabase } = await getSupabaseWithUserContext()
    const ticketId = params.id

    const [ticketResult, commentsResult, subtasksResult] = await Promise.all([
      (async () => {
        const baseSelect = `
            *,
            project:projects(id, name, description, require_sqa),
            assignee:users!tickets_assignee_id_fkey(id, name, email),
            sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email),
            requested_by:users!tickets_requested_by_id_fkey(id, name, email),
            department:departments(id, name),
            epic:epics(id, name, color),
            sprint:sprints(id, name, status, start_date, end_date)
          `
        const relationSelect = `${baseSelect}, parent_ticket:tickets!tickets_parent_ticket_id_fkey(id, display_id, title, status, type)`

        const withRelation = await supabase
          .from("tickets")
          .select(relationSelect)
          .eq("id", ticketId)
          .maybeSingle()

        let ticket: any = withRelation.data
        let error: any = withRelation.error

        if (error) {
          const fallback = await supabase
            .from("tickets")
            .select(baseSelect)
            .eq("id", ticketId)
            .maybeSingle()
          ticket = fallback.data
          error = fallback.error
          if (ticket && !("parent_ticket" in ticket)) {
            ticket.parent_ticket = null
          }
        }

        if (error) {
          if (error.message?.includes("coerce") || error.message?.includes("single JSON")) {
            return { ticket: null, error: "Ticket data inconsistency detected", status: 500 as const }
          }
          return { ticket: null, error: "Failed to fetch ticket", status: 500 as const }
        }

        if (!ticket) {
          return { ticket: null, error: "Ticket not found", status: 404 as const }
        }

        const emails = new Set<string>()
        if (ticket.assignee?.email) emails.add(ticket.assignee.email)
        if (ticket.sqa_assignee?.email) emails.add(ticket.sqa_assignee.email)
        if (ticket.requested_by?.email) emails.add(ticket.requested_by.email)

        let enrichedTicket = ticket
        if (emails.size > 0) {
          const { data: authUsers } = await supabase
            .from("auth_user")
            .select("email, image")
            .in("email", Array.from(emails))

          const imageMap = new Map<string, string | null>()
          authUsers?.forEach((au) => {
            imageMap.set(au.email, au.image || null)
          })

          enrichedTicket = {
            ...enrichedTicket,
            assignee: ticket.assignee
              ? {
                  ...ticket.assignee,
                  image: imageMap.get(ticket.assignee.email) || null,
                }
              : null,
            sqa_assignee: ticket.sqa_assignee
              ? {
                  ...ticket.sqa_assignee,
                  image: imageMap.get(ticket.sqa_assignee.email) || null,
                }
              : null,
          }
        }

        return { ticket: enrichedTicket }
      })(),
      (async () => {
        const { data: comments, error: commentsError } = await supabase
          .from("ticket_comments")
          .select(
            `
            id,
            ticket_id,
            parent_id,
            author_id,
            body,
            created_at,
            updated_at,
            author:users!ticket_comments_author_id_fkey(id, name, email, avatar_url),
            mentions:comment_mentions(
              user_id,
              user:users!comment_mentions_user_id_fkey(id, name, email, avatar_url)
            )
          `
          )
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true })

        if (commentsError) {
          console.error("Error fetching comments:", commentsError)
          // Keep detail dialog usable even if comments fail.
          return { comments: [] }
        }

        type CommentWithAuthor = {
          id: string
          ticket_id: string
          parent_id: string | null
          author_id: string
          body: string
          created_at: string
          updated_at: string
          author: { id: string; name: string | null; email: string; avatar_url?: string | null }
          mentions: { user_id: string; user: { id: string; name: string | null; email: string; avatar_url?: string | null } }[]
        }

        const normalizedComments: CommentWithAuthor[] = (comments || []).map((c: any) => {
          const author = Array.isArray(c.author) ? c.author[0] : c.author
          const rawMentions = Array.isArray(c.mentions) ? c.mentions : []
          const mentions = rawMentions
            .map((m: any) => ({
              user_id: m.user_id as string,
              user: (Array.isArray(m.user) ? m.user[0] : m.user) as
                | { id: string; name: string | null; email: string; avatar_url?: string | null }
                | null,
            }))
            .filter((m: any) => m.user)

          return {
            id: c.id,
            ticket_id: c.ticket_id,
            parent_id: c.parent_id,
            author_id: c.author_id,
            body: c.body,
            created_at: c.created_at,
            updated_at: c.updated_at,
            author,
            mentions: mentions as {
              user_id: string
              user: { id: string; name: string | null; email: string; avatar_url?: string | null }
            }[],
          }
        })

        type EnrichedComment = CommentWithAuthor & {
          replies: EnrichedComment[]
        }

        const rootComments = normalizedComments.filter((c) => !c.parent_id)
        const repliesByParent = normalizedComments.reduce(
          (acc: Record<string, CommentWithAuthor[]>, c) => {
            if (c.parent_id) {
              if (!acc[c.parent_id]) acc[c.parent_id] = []
              acc[c.parent_id].push(c)
            }
            return acc
          },
          {}
        )

        const enrich = (c: CommentWithAuthor): EnrichedComment => ({
          ...c,
          mentions: c.mentions || [],
          replies: (repliesByParent[c.id] || []).map(enrich),
        })

        const tree = rootComments.map(enrich)
        return { comments: tree }
      })(),
      (async () => {
        const { data: subtasks, error } = await supabase
          .from("tickets")
          .select("id, display_id, title, status, type")
          .eq("parent_ticket_id", ticketId)
          .order("created_at", { ascending: true })

        if (error) {
          console.error("Error fetching related subtickets:", error)
          // Keep detail dialog usable even if relation fetch fails.
          return { subtasks: [] }
        }

        return { subtasks: subtasks || [] }
      })(),
    ])

    const ticketPayload = ticketResult as {
      ticket?: unknown
      error?: string
      status?: number
    }
    const commentsPayload = commentsResult as {
      comments?: unknown[]
      error?: string
      status?: number
    }
    if (ticketPayload.status === 500) {
      return NextResponse.json(
        { error: ticketPayload.error || "Failed to fetch ticket" },
        { status: 500 }
      )
    }
    if (ticketPayload.status === 404 || !ticketPayload.ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }
    const subtaskResult = (subtasksResult as { subtasks?: any[] }) || {}

    const ticket = ticketPayload.ticket as any
    const comments = commentsPayload.comments ?? []
    const relatedSubtasks = subtaskResult.subtasks ?? []

    const parentTicket = Array.isArray(ticket.parent_ticket)
      ? ticket.parent_ticket[0] || null
      : ticket.parent_ticket || null

    type CommentNode = { id: string; body: string; replies?: CommentNode[] }
    const mentionCommentIdsBySlug = new Map<string, Set<string>>()
    const visitComments = (nodes: CommentNode[]) => {
      nodes.forEach((node) => {
        const slugs = extractMentionedTicketSlugs(node.body || "")
        slugs.forEach((slug) => {
          if (!mentionCommentIdsBySlug.has(slug)) {
            mentionCommentIdsBySlug.set(slug, new Set<string>())
          }
          mentionCommentIdsBySlug.get(slug)?.add(node.id)
        })
        if (node.replies?.length) {
          visitComments(node.replies)
        }
      })
    }
    visitComments(comments as CommentNode[])

    const currentDisplaySlug = String(ticket.display_id || "").toLowerCase()
    const mentionDisplayIds = Array.from(mentionCommentIdsBySlug.keys())
      .filter((slug) => slug && slug !== currentDisplaySlug)
      .map((slug) => slug.toUpperCase())

    let mentionedInComments: Array<{
      ticket: { id: string; display_id: string | null; title: string; status: string; type: string | null }
      comment_ids: string[]
    }> = []

    if (mentionDisplayIds.length > 0) {
      const { data: mentionedTickets, error: mentionTicketError } = await supabase
        .from("tickets")
        .select("id, display_id, title, status, type")
        .in("display_id", mentionDisplayIds)

      if (mentionTicketError) {
        console.error("Error resolving mentioned tickets:", mentionTicketError)
      } else if (Array.isArray(mentionedTickets)) {
        const ticketBySlug = new Map<string, any>()
        mentionedTickets.forEach((item) => {
          const slug = String(item.display_id || "").toLowerCase()
          if (slug) ticketBySlug.set(slug, item)
        })

        mentionedInComments = Array.from(mentionCommentIdsBySlug.entries())
          .map(([slug, commentIdsSet]) => {
            const mentionedTicket = ticketBySlug.get(slug)
            if (!mentionedTicket) return null
            return {
              ticket: {
                id: mentionedTicket.id,
                display_id: mentionedTicket.display_id,
                title: mentionedTicket.title,
                status: mentionedTicket.status,
                type: mentionedTicket.type || null,
              },
              comment_ids: Array.from(commentIdsSet),
            }
          })
          .filter(Boolean) as Array<{
          ticket: { id: string; display_id: string | null; title: string; status: string; type: string | null }
          comment_ids: string[]
        }>
      }
    }

    return NextResponse.json({
      ticket,
      comments,
      relations: {
        parent: parentTicket
          ? {
              id: parentTicket.id,
              display_id: parentTicket.display_id,
              title: parentTicket.title,
              status: parentTicket.status,
              type: parentTicket.type || null,
            }
          : null,
        subtasks: relatedSubtasks.map((item) => ({
          id: item.id,
          display_id: item.display_id,
          title: item.title,
          status: item.status,
          type: item.type || null,
        })),
        mentioned_in_comments: mentionedInComments,
      },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/tickets/[id]/detail:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
