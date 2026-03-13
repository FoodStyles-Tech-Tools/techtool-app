import type { ServerSupabaseClient } from "@server/lib/supabase"

type UserRow = { id: string; name: string | null; email: string; avatar_url?: string | null }
type MentionRow = { user_id: string; user: UserRow | UserRow[] | null }
type CommentRow = {
  id: string
  ticket_id: string
  parent_id: string | null
  author_id: string
  body: string
  created_at: string
  updated_at: string
  author: UserRow | UserRow[] | null
  mentions: MentionRow[] | null
}
type CommentWithReplies = CommentRow & { replies?: CommentWithReplies[] }
type SubtaskRow = {
  id: string
  display_id: string | null
  title: string
  status: string
  type: string | null
  priority: string
  assignee: UserRow | UserRow[] | null
}
type TicketMentionRow = { id: string; display_id: string | null; title: string; status: string; type: string | null }

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

function normalizeUser(
  user: UserRow | UserRow[] | null | undefined
): (UserRow & { image: string | null }) | null {
  if (!user) return null
  const normalized = Array.isArray(user) ? user[0] : user
  if (!normalized) return null

  return {
    ...normalized,
    image: normalized.avatar_url ?? null,
  }
}

export async function fetchTicketDetailPayload(supabase: ServerSupabaseClient, ticketId: string) {
  const [ticketResult, commentsResult, subtasksResult] = await Promise.all([
    (async () => {
      const baseSelect = `
        *,
        project:projects(id, name, description, require_sqa),
        assignee:users!tickets_assignee_id_fkey(id, name, email, avatar_url),
        sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email, avatar_url),
        requested_by:users!tickets_requested_by_id_fkey(id, name, email, avatar_url),
        department:departments(id, name),
        epic:epics(id, name, color),
        sprint:sprints(id, name, start_date, end_date),
        deploy_round:deploy_rounds(id, name)
      `
      const relationSelect = `${baseSelect}, parent_ticket:tickets!tickets_parent_ticket_id_fkey(id, display_id, title, status, type)`

      const withRelation = await supabase
        .from("tickets")
        .select(relationSelect)
        .eq("id", ticketId)
        .maybeSingle()

      let ticket = withRelation.data
      let error = withRelation.error

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

      return {
        ticket: {
          ...ticket,
          assignee: normalizeUser(ticket.assignee),
          sqa_assignee: normalizeUser(ticket.sqa_assignee),
          requested_by: normalizeUser(ticket.requested_by),
        },
      }
    })(),
    (async () => {
      const { data: comments, error } = await supabase
        .from("ticket_comments")
        .select(`
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
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true })

      if (error) {
        return { comments: [] }
      }

      const normalizedComments = (comments || []).map((comment: CommentRow) => {
        const author = Array.isArray(comment.author) ? comment.author[0] : comment.author
        const mentions = Array.isArray(comment.mentions)
          ? comment.mentions
              .map((mention: MentionRow) => ({
                user_id: mention.user_id,
                user: Array.isArray(mention.user) ? mention.user[0] : mention.user,
              }))
              .filter((m): m is { user_id: string; user: UserRow } => m.user != null)
          : []

        return {
          ...comment,
          author,
          mentions,
        }
      })

      const rootComments = normalizedComments.filter((c) => !c.parent_id)
      const repliesByParent = normalizedComments.reduce<Record<string, CommentRow[]>>((acc, comment) => {
        if (!comment.parent_id) return acc
        if (!acc[comment.parent_id]) acc[comment.parent_id] = []
        acc[comment.parent_id].push(comment)
        return acc
      }, {})

      const enrichComment = (comment: CommentRow): CommentWithReplies => ({
        ...comment,
        replies: (repliesByParent[comment.id] ?? []).map(enrichComment),
      })

      return { comments: rootComments.map(enrichComment) }
    })(),
    (async () => {
      const { data: subtasks, error } = await supabase
        .from("tickets")
        .select(
          `
          id,
          display_id,
          title,
          status,
          type,
          priority,
          assignee:users!tickets_assignee_id_fkey(id, name, email, avatar_url)
        `
        )
        .eq("parent_ticket_id", ticketId)
        .order("created_at", { ascending: true })

      if (error) {
        return { subtasks: [] }
      }

      return { subtasks: subtasks || [] }
    })(),
  ])

  if (ticketResult.status === 500) {
    return ticketResult
  }

  if (ticketResult.status === 404 || !ticketResult.ticket) {
    return { ticket: null, error: "Ticket not found", status: 404 as const }
  }

  const ticket = ticketResult.ticket as Record<string, unknown> & { display_id?: string | null; parent_ticket?: unknown }
  const comments: Array<{ id: string; body: string; replies?: unknown[] }> =
    (commentsResult.comments ?? []) as Array<{ id: string; body: string; replies?: unknown[] }>
  const relatedSubtasks = subtasksResult.subtasks ?? []
  const parentTicket = Array.isArray(ticket.parent_ticket) ? ticket.parent_ticket[0] ?? null : ticket.parent_ticket ?? null

  const mentionCommentIdsBySlug = new Map<string, Set<string>>()
  const visitComments = (nodes: Array<{ id: string; body: string; replies?: unknown[] }>) => {
    nodes.forEach((node) => {
      extractMentionedTicketSlugs(node.body || "").forEach((slug) => {
        if (!mentionCommentIdsBySlug.has(slug)) {
          mentionCommentIdsBySlug.set(slug, new Set<string>())
        }
        mentionCommentIdsBySlug.get(slug)?.add(node.id)
      })
      if (node.replies?.length) {
        visitComments(node.replies as Array<{ id: string; body: string; replies?: unknown[] }>)
      }
    })
  }
  visitComments(comments)

  const currentDisplaySlug = String(ticket.display_id ?? "").toLowerCase()
  const mentionDisplayIds = Array.from(mentionCommentIdsBySlug.keys())
    .filter((slug) => slug && slug !== currentDisplaySlug)
    .map((slug) => slug.toUpperCase())

  let mentionedInComments: Array<{
    ticket: { id: string; display_id: string | null; title: string; status: string; type: string | null }
    comment_ids: string[]
  }> = []

  if (mentionDisplayIds.length > 0) {
    const { data: mentionedTickets, error } = await supabase
      .from("tickets")
      .select("id, display_id, title, status, type")
      .in("display_id", mentionDisplayIds)

    if (!error && Array.isArray(mentionedTickets)) {
      const ticketBySlug = new Map<string, TicketMentionRow>()
      mentionedTickets.forEach((item: TicketMentionRow) => {
        const slug = String(item.display_id ?? "").toLowerCase()
        if (slug) ticketBySlug.set(slug, item)
      })

      mentionedInComments = Array.from(mentionCommentIdsBySlug.entries())
        .map(([slug, commentIds]) => {
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
            comment_ids: Array.from(commentIds),
          }
        })
        .filter(Boolean) as Array<{
        ticket: { id: string; display_id: string | null; title: string; status: string; type: string | null }
        comment_ids: string[]
      }>
    }
  }

  return {
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
      subtasks: (relatedSubtasks as SubtaskRow[]).map((item) => ({
        id: item.id,
        display_id: item.display_id,
        title: item.title,
        status: item.status,
        type: item.type ?? null,
        priority: item.priority,
        assignee: normalizeUser(item.assignee),
      })),
      mentioned_in_comments: mentionedInComments,
    },
  }
}

