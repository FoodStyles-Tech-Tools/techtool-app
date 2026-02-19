import { NextRequest, NextResponse } from "next/server"
import { requirePermission, getSupabaseWithUserContext } from "@/lib/auth-helpers"
import { startTiming, endTiming } from "@/lib/query-timing"

export const runtime = "nodejs"

/** GET /api/tickets/[id]/comments – list all comments for a ticket (threaded: root comments with replies, authors, mentions) */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = performance.now()
  try {
    await requirePermission("tickets", "view")
    const { supabase } = await getSupabaseWithUserContext()

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
    await requirePermission("tickets", "edit")
    const { supabase, userId } = await getSupabaseWithUserContext()

    const ticketId = params.id
    const body = await request.json()
    const { body: text, parent_id = null, mention_user_ids = [] } = body as {
      body: string
      parent_id?: string | null
      mention_user_ids?: string[]
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Comment body is required" },
        { status: 400 }
      )
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, display_id")
      .eq("id", ticketId)
      .maybeSingle()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    const { data: comment, error: insertError } = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: ticketId,
        parent_id: parent_id || null,
        author_id: userId,
        body: text.trim(),
      })
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
      .single()

    if (insertError) {
      console.error("Error creating comment:", insertError)
      return NextResponse.json(
        { error: insertError.message || "Failed to create comment" },
        { status: 500 }
      )
    }

    const uniqueMentions = Array.from(
      new Set((mention_user_ids as string[]).filter((id): id is string => typeof id === "string" && id !== userId))
    )

    if (uniqueMentions.length > 0) {
      await supabase.from("comment_mentions").insert(
        uniqueMentions.map((user_id) => ({
          comment_id: comment.id,
          user_id,
        }))
      )
    }

    const notificationsToInsert: { user_id: string; type: "reply" | "mention"; comment_id: string; ticket_id: string }[] = []
    const notifiedUserIds = new Set<string>()

    const addNotification = (user_id: string, type: "reply" | "mention") => {
      if (user_id === userId) return
      if (notifiedUserIds.has(user_id)) return
      notifiedUserIds.add(user_id)
      notificationsToInsert.push({ user_id, type, comment_id: comment.id, ticket_id: ticketId })
    }

    if (parent_id) {
      const [parentResult, mentionsResult, repliesResult] = await Promise.all([
        supabase
          .from("ticket_comments")
          .select("author_id")
          .eq("id", parent_id)
          .single(),
        supabase
          .from("comment_mentions")
          .select("user_id")
          .eq("comment_id", parent_id),
        supabase
          .from("ticket_comments")
          .select("author_id")
          .eq("parent_id", parent_id)
          .neq("id", comment.id),
      ])

      if (parentResult.data?.author_id) {
        addNotification(parentResult.data.author_id, "reply")
      }

      if (mentionsResult.data && mentionsResult.data.length > 0) {
        for (const mention of mentionsResult.data) {
          addNotification(mention.user_id, "reply")
        }
      }

      if (repliesResult.data && repliesResult.data.length > 0) {
        for (const reply of repliesResult.data) {
          if (reply.author_id) {
            addNotification(reply.author_id, "reply")
          }
        }
      }
    }

    for (const uid of uniqueMentions) {
      addNotification(uid, "mention")
    }

    if (notificationsToInsert.length > 0) {
      await supabase.from("comment_notifications").insert(notificationsToInsert)
    }

    const normalizedAuthor = Array.isArray(comment.author) ? comment.author[0] : comment.author

    return NextResponse.json({
      comment: {
        ...comment,
        author: normalizedAuthor,
        mentions: uniqueMentions.map((user_id) => ({ user_id })),
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
