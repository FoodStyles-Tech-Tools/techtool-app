import { createServerClient } from "@server/lib/supabase"

type SupabaseClientLike = Awaited<ReturnType<typeof createServerClient>>

const DISPLAY_TICKET_SELECT = `
  *,
  project:projects(id, name, description, require_sqa),
  assignee:users!tickets_assignee_id_fkey(id, name, email, avatar_url),
  sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email, avatar_url),
  requested_by:users!tickets_requested_by_id_fkey(id, name, email, avatar_url),
  department:departments(id, name),
  epic:epics(id, name, color)
`

const COMMENT_SELECT = `
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

const COMMENT_AUTHOR_SELECT = `
  id,
  ticket_id,
  parent_id,
  author_id,
  body,
  created_at,
  updated_at,
  author:users!ticket_comments_author_id_fkey(id, name, email, avatar_url)
`

export function findTicketByDisplayId(supabase: SupabaseClientLike, displayId: string) {
  return supabase
    .from("tickets")
    .select(DISPLAY_TICKET_SELECT)
    .eq("display_id", displayId)
    .maybeSingle()
}

export function findSubtaskParents(supabase: SupabaseClientLike, parentTicketIds: string[]) {
  return supabase
    .from("tickets")
    .select("parent_ticket_id")
    .eq("type", "subtask")
    .in("parent_ticket_id", parentTicketIds)
}

export function findTicketById(supabase: SupabaseClientLike, ticketId: string) {
  return supabase.from("tickets").select("id, display_id").eq("id", ticketId).maybeSingle()
}

export function listTicketActivity(supabase: SupabaseClientLike, ticketId: string) {
  return supabase
    .from("ticket_activity")
    .select(
      `
      id,
      ticket_id,
      actor_id,
      event_type,
      field_name,
      old_value,
      new_value,
      metadata,
      created_at,
      actor:users!ticket_activity_actor_id_fkey(id, name, email, avatar_url)
    `
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(300)
}

export function listTicketComments(supabase: SupabaseClientLike, ticketId: string) {
  return supabase
    .from("ticket_comments")
    .select(COMMENT_SELECT)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
}

export function createCommentWithNotifications(
  supabase: SupabaseClientLike,
  payload: {
    p_ticket_id: string
    p_author_id: string
    p_body: string
    p_parent_id: string | null
    p_mention_user_ids: string[]
  }
) {
  return supabase.rpc("create_ticket_comment_with_notifications", payload)
}

export function findCommentById(supabase: SupabaseClientLike, commentId: string) {
  return supabase
    .from("ticket_comments")
    .select(COMMENT_AUTHOR_SELECT)
    .eq("id", commentId)
    .single()
}

export function findUsersByIds(supabase: SupabaseClientLike, userIds: string[]) {
  return supabase.from("users").select("id, name, email, avatar_url").in("id", userIds)
}

export function findOwnedComment(
  supabase: SupabaseClientLike,
  ticketId: string,
  commentId: string
) {
  return supabase
    .from("ticket_comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("ticket_id", ticketId)
    .single()
}

export function updateComment(
  supabase: SupabaseClientLike,
  commentId: string,
  body: string
) {
  return supabase
    .from("ticket_comments")
    .update({ body })
    .eq("id", commentId)
    .select(COMMENT_AUTHOR_SELECT)
    .single()
}

export function deleteComment(supabase: SupabaseClientLike, commentId: string) {
  return supabase.from("ticket_comments").delete().eq("id", commentId)
}
