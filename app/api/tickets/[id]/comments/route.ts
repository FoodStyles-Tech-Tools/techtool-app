import { NextRequest, NextResponse } from "next/server"
import { getRequestContext } from "@/lib/auth-helpers"
import { startTiming, endTiming } from "@/lib/query-timing"
import { isRichTextEmpty } from "@/lib/rich-text"

export const runtime = "nodejs"
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** GET /api/tickets/[id]/comments – list all comments for a ticket (threaded: root comments with replies, authors, mentions) */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = performance.now()
  try {
    const { supabase } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
    })

    const ticketId = params.id

    const timings: Record<string, number> = {}

    // OPTIMIZED: Parallelize ticket check and comments fetch
    const [ticketResult, commentsResult] = await Promise.all([
      (async () => {
        const timingId = startTiming(`GET /api/tickets/${ticketId}/comments - check ticket`)
        const result = await supabase
          .from("tickets")
          .select("id, display_id")
          .eq("id", ticketId)
          .maybeSingle()
        timings.ticket = endTiming(timingId, 100) || 0
        return result
      })(),
      (async () => {
        const timingId = startTiming(`GET /api/tickets/${ticketId}/comments - fetch comments`)
        const result = await supabase
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
        timings.comments = endTiming(timingId, 100) || 0
        return result
      })(),
    ])

    const { data: ticket, error: ticketError } = ticketResult
    const { data: comments, error: commentsError } = commentsResult

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    if (commentsError) {
      console.error("Error fetching comments:", commentsError)
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      )
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

    // Normalize author field from Supabase response (may be array or object)
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
        mentions: mentions as { user_id: string; user: { id: string; name: string | null; email: string; avatar_url?: string | null } }[],
      }
    })

    type EnrichedComment = CommentWithAuthor & {
      mentions: { user_id: string; user: { id: string; name: string | null; email: string; avatar_url?: string | null } }[]
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

    const totalTime = performance.now() - startTime
    if (totalTime > 500) {
      const ticketTiming = timings.ticket?.toFixed(2) ?? "0.00"
      const commentsTiming = timings.comments?.toFixed(2) ?? "0.00"
      console.log(
        `[SLOW ENDPOINT] GET /api/tickets/${params.id}/comments: ${totalTime.toFixed(2)}ms`
      )
      console.log(
        `[QUERY TIMINGS] GET /api/tickets/${params.id}/comments: ticket=${ticketTiming}ms comments=${commentsTiming}ms total=${totalTime.toFixed(2)}ms`
      )
    }

    return NextResponse.json({
      comments: tree,
      ticket: { id: ticket.id, display_id: ticket.display_id },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/tickets/[id]/comments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/** POST /api/tickets/[id]/comments – create comment (optionally reply, optionally mention users); creates notifications */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })

    const ticketId = params.id
    const body = await request.json()
    const { body: text, parent_id = null, mention_user_ids = [] } = body as {
      body: string
      parent_id?: string | null
      mention_user_ids?: string[]
    }

    if (!text || typeof text !== "string" || isRichTextEmpty(text)) {
      return NextResponse.json(
        { error: "Comment body is required" },
        { status: 400 }
      )
    }

    const uniqueMentions = Array.from(
      new Set(
        (mention_user_ids as string[]).filter(
          (id): id is string =>
            typeof id === "string" && UUID_REGEX.test(id) && id !== userId
        )
      )
    )

    const { data: rpcRows, error: rpcError } = await supabase.rpc(
      "create_ticket_comment_with_notifications",
      {
        p_ticket_id: ticketId,
        p_author_id: userId,
        p_body: text.trim(),
        p_parent_id: parent_id || null,
        p_mention_user_ids: uniqueMentions,
      }
    )

    if (rpcError || !Array.isArray(rpcRows) || rpcRows.length === 0) {
      const detail = rpcError?.details || ""
      if (detail === "ticket_not_found") {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
      }
      if (detail === "parent_comment_not_found") {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 400 })
      }
      if (detail === "parent_comment_ticket_mismatch") {
        return NextResponse.json(
          { error: "Parent comment does not belong to this ticket" },
          { status: 400 }
        )
      }
      console.error("Error creating comment via RPC:", rpcError)
      return NextResponse.json(
        { error: rpcError?.message || "Failed to create comment" },
        { status: 500 }
      )
    }

    const createdRow = rpcRows[0] as {
      comment_id: string
      mention_user_ids: string[] | null
    }

    const { data: comment, error: commentError } = await supabase
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
        author:users!ticket_comments_author_id_fkey(id, name, email, avatar_url)
      `
      )
      .eq("id", createdRow.comment_id)
      .single()

    if (commentError || !comment) {
      console.error("Error loading created comment:", commentError)
      return NextResponse.json(
        { error: "Failed to load created comment" },
        { status: 500 }
      )
    }

    const mentionIds = (createdRow.mention_user_ids || []).filter((id) => typeof id === "string")
    let mentionUsersById = new Map<
      string,
      { id: string; name: string | null; email: string; avatar_url?: string | null }
    >()
    if (mentionIds.length > 0) {
      const { data: mentionUsers } = await supabase
        .from("users")
        .select("id, name, email, avatar_url")
        .in("id", mentionIds)

      if (Array.isArray(mentionUsers)) {
        mentionUsersById = new Map(
          mentionUsers.map((user) => [
            user.id,
            user as { id: string; name: string | null; email: string; avatar_url?: string | null },
          ])
        )
      }
    }

    const normalizedAuthor = Array.isArray(comment.author) ? comment.author[0] : comment.author

    return NextResponse.json({
      comment: {
        ...comment,
        author: normalizedAuthor,
        mentions: mentionIds.map((user_id) => ({
          user_id,
          user: mentionUsersById.get(user_id),
        })),
        replies: [],
      },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/tickets/[id]/comments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
