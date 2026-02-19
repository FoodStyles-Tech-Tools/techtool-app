import { NextRequest, NextResponse } from "next/server"
import { getSupabaseWithUserContext } from "@/lib/auth-helpers"
import type { CursorPage } from "@/types/api/common"

type CommentNotification = {
  id: string
  user_id: string
  type: "reply" | "mention"
  comment_id: string
  ticket_id: string
  created_at: string
  read_at: string | null
  comment?: {
    id: string
    body: string
    author_id: string
    parent_id: string | null
    created_at: string
    author?: { id: string; name: string | null; email: string }
  }
  ticket?: {
    id: string
    display_id: string | null
    title: string
  }
}

type RawCommentNotificationRow = {
  id: string
  user_id: string
  type: "reply" | "mention"
  comment_id: string
  ticket_id: string
  created_at: string
  read_at: string | null
  comment:
    | Array<{
        id: string
        body: string
        author_id: string
        parent_id: string | null
        created_at: string
        author: Array<{ id: string; name: string | null; email: string }>
      }>
    | null
  ticket:
    | Array<{
        id: string
        display_id: string | null
        title: string
      }>
    | null
}

function normalizeRow(row: RawCommentNotificationRow): CommentNotification {
  const rawComment = Array.isArray(row.comment) ? row.comment[0] : undefined
  const rawAuthor = rawComment && Array.isArray(rawComment.author) ? rawComment.author[0] : undefined
  const rawTicket = Array.isArray(row.ticket) ? row.ticket[0] : undefined

  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    comment_id: row.comment_id,
    ticket_id: row.ticket_id,
    created_at: row.created_at,
    read_at: row.read_at,
    comment: rawComment
      ? {
          id: rawComment.id,
          body: rawComment.body,
          author_id: rawComment.author_id,
          parent_id: rawComment.parent_id,
          created_at: rawComment.created_at,
          author: rawAuthor
            ? {
                id: rawAuthor.id,
                name: rawAuthor.name,
                email: rawAuthor.email,
              }
            : undefined,
        }
      : undefined,
    ticket: rawTicket
      ? {
          id: rawTicket.id,
          display_id: rawTicket.display_id,
          title: rawTicket.title,
        }
      : undefined,
  }
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseWithUserContext()
    const { searchParams } = new URL(request.url)

    const cursor = searchParams.get("cursor")
    const unreadOnly = searchParams.get("unread_only") === "true"
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100)

    let query = supabase
      .from("comment_notifications")
      .select(
        `
        id,
        user_id,
        type,
        comment_id,
        ticket_id,
        created_at,
        read_at,
        comment:ticket_comments(id, body, author_id, parent_id, created_at, author:users!ticket_comments_author_id_fkey(id, name, email, avatar_url)),
        ticket:tickets(id, display_id, title)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      query = query.lt("created_at", cursor)
    }
    if (unreadOnly) {
      query = query.is("read_at", null)
    }

    const { data, error } = await query
    if (error) {
      console.error("Error fetching v2 notifications:", error)
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
    }

    const rawRows = (data || []) as RawCommentNotificationRow[]
    const rows = rawRows.map(normalizeRow)
    const pageRows = rows.slice(0, limit)
    const nextCursor =
      rows.length > limit ? pageRows[pageRows.length - 1]?.created_at || null : null

    const { count: unreadCount } = await supabase
      .from("comment_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)

    const payload: CursorPage<CommentNotification> & { unread_count: number } = {
      data: pageRows,
      nextCursor,
      unread_count: unreadCount ?? 0,
    }

    return NextResponse.json(payload)
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error in GET /api/v2/notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
