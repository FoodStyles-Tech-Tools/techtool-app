import { NextRequest, NextResponse } from "next/server"
import { requirePermission, getSupabaseWithUserContext } from "@/lib/auth-helpers"

export const runtime = "nodejs"

/** GET /api/tickets/[id]/detail – ticket + comments in one response for the detail dialog */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("tickets", "view")
    const { supabase } = await getSupabaseWithUserContext()
    const ticketId = params.id

    const [ticketResult, commentsResult] = await Promise.all([
      (async () => {
        const { data: ticket, error } = await supabase
          .from("tickets")
          .select(
            `
            *,
            project:projects(id, name, description),
            assignee:users!tickets_assignee_id_fkey(id, name, email),
            sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email),
            requested_by:users!tickets_requested_by_id_fkey(id, name, email),
            department:departments(id, name),
            epic:epics(id, name, color),
            sprint:sprints(id, name, status, start_date, end_date)
          `
          )
          .eq("id", ticketId)
          .maybeSingle()

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
            author:users!ticket_comments_author_id_fkey(id, name, email),
            mentions:comment_mentions(
              user_id,
              user:users!comment_mentions_user_id_fkey(id, name, email)
            )
          `
          )
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true })

        if (commentsError) {
          console.error("Error fetching comments:", commentsError)
          return { comments: [], error: "Failed to fetch comments", status: 500 as const }
        }

        type CommentWithAuthor = {
          id: string
          ticket_id: string
          parent_id: string | null
          author_id: string
          body: string
          created_at: string
          updated_at: string
          author: { id: string; name: string | null; email: string }
          mentions: { user_id: string; user: { id: string; name: string | null; email: string } }[]
        }

        const normalizedComments: CommentWithAuthor[] = (comments || []).map((c: any) => {
          const author = Array.isArray(c.author) ? c.author[0] : c.author
          const rawMentions = Array.isArray(c.mentions) ? c.mentions : []
          const mentions = rawMentions
            .map((m: any) => ({
              user_id: m.user_id as string,
              user: (Array.isArray(m.user) ? m.user[0] : m.user) as
                | { id: string; name: string | null; email: string }
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
              user: { id: string; name: string | null; email: string }
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

    if (ticketPayload.status === 404 || !ticketPayload.ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }
    if (ticketPayload.status === 500) {
      return NextResponse.json(
        { error: ticketPayload.error || "Failed to fetch ticket" },
        { status: 500 }
      )
    }
    if (commentsPayload.status === 500) {
      return NextResponse.json(
        { error: commentsPayload.error || "Failed to fetch comments" },
        { status: 500 }
      )
    }

    const ticket = ticketPayload.ticket
    const comments = commentsPayload.comments ?? []

    return NextResponse.json({ ticket, comments })
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
