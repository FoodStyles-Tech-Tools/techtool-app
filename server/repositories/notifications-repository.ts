import { HttpError } from "@server/http/http-error"

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase").createServerClient>>

export type CommentNotification = {
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

const COMMENT_NOTIFICATION_SELECT = `
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

export async function listCommentNotifications(
  supabase: SupabaseClient,
  input: { userId: string; unreadOnly: boolean; limit: number }
) {
  let query = supabase
    .from("comment_notifications")
    .select(COMMENT_NOTIFICATION_SELECT)
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(input.limit)

  if (input.unreadOnly) {
    query = query.is("read_at", null)
  }

  const { data, error } = await query
  if (error) {
    console.error("Error fetching comment notifications:", error)
    throw new HttpError(500, "Failed to fetch notifications")
  }

  return (data || []) as RawCommentNotificationRow[]
}

export async function listV2CommentNotifications(
  supabase: SupabaseClient,
  input: { userId: string; cursor: string | null; unreadOnly: boolean; limit: number }
) {
  let query = supabase
    .from("comment_notifications")
    .select(COMMENT_NOTIFICATION_SELECT)
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(input.limit + 1)

  if (input.cursor) {
    query = query.lt("created_at", input.cursor)
  }
  if (input.unreadOnly) {
    query = query.is("read_at", null)
  }

  const { data, error } = await query
  if (error) {
    console.error("Error fetching v2 notifications:", error)
    throw new HttpError(500, "Failed to fetch notifications")
  }

  const rows = ((data || []) as RawCommentNotificationRow[]).map(normalizeRow)
  const pageRows = rows.slice(0, input.limit)
  const nextCursor =
    rows.length > input.limit ? pageRows[pageRows.length - 1]?.created_at || null : null

  return {
    data: pageRows,
    nextCursor,
  }
}

export async function countUnreadNotifications(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("comment_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) {
    console.error("Error counting unread notifications:", error)
    throw new HttpError(500, "Failed to fetch notifications")
  }

  return count ?? 0
}

export async function markNotificationsRead(
  supabase: SupabaseClient,
  input: { userId: string; ids?: string[]; ticketId?: string | null }
) {
  let query = supabase
    .from("comment_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .is("read_at", null)

  if (input.ticketId) {
    query = query.eq("ticket_id", input.ticketId)
  } else if (Array.isArray(input.ids) && input.ids.length > 0) {
    query = query.in("id", input.ids)
  }

  const { error } = await query
  if (error) {
    console.error("Error marking notifications read:", error)
    throw new HttpError(500, "Failed to update notifications")
  }
}

export async function getCommentNotificationById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("comment_notifications")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("Error fetching notification:", error)
    throw new HttpError(500, "Failed to update notification")
  }

  return data as { id: string; user_id: string } | null
}

export async function markCommentNotificationReadById(supabase: SupabaseClient, id: string) {
  const readAt = new Date().toISOString()
  const { data, error } = await supabase
    .from("comment_notifications")
    .update({ read_at: readAt })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error marking notification read:", error)
    throw new HttpError(500, "Failed to update notification")
  }

  return data as Record<string, unknown>
}
