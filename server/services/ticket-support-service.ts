import { isRichTextEmpty } from "@shared/rich-text"
import { invalidateTicketCaches } from "@server/lib/ticket-cache"
import { HttpError } from "@server/http/http-error"
import * as ticketSupportRepository from "@server/repositories/ticket-support-repository"
import type { CreateCommentInput, UpdateCommentInput } from "@server/validation/ticket-support"

type TicketSupportContext = {
  supabase: Parameters<typeof ticketSupportRepository.findTicketByDisplayId>[0]
  userId: string
}

function normalizeUser<T extends { avatar_url?: string | null }>(value: T | T[] | null | undefined) {
  const normalized = Array.isArray(value) ? value[0] ?? null : value ?? null
  if (!normalized) return null

  return {
    ...normalized,
    image: normalized.avatar_url || null,
  }
}

type CommentRow = {
  id: string
  ticket_id: string
  parent_id: string | null
  author_id: string
  body: string
  created_at: string
  updated_at: string
  author: { id: string; name: string | null; email: string; avatar_url?: string | null } | Array<{ id: string; name: string | null; email: string; avatar_url?: string | null }>
  mentions?: Array<{
    user_id: string
    user:
      | { id: string; name: string | null; email: string; avatar_url?: string | null }
      | Array<{ id: string; name: string | null; email: string; avatar_url?: string | null }>
      | null
  }>
}

function normalizeCommentRow(row: CommentRow) {
  const mentions = Array.isArray(row.mentions)
    ? row.mentions
        .map((mention) => ({
          user_id: mention.user_id,
          user: Array.isArray(mention.user) ? mention.user[0] ?? undefined : mention.user ?? undefined,
        }))
        .filter((mention) => mention.user)
    : []

  return {
    ...row,
    author: normalizeUser(row.author),
    mentions,
  }
}

function buildCommentTree(rows: CommentRow[]) {
  const normalized = rows.map(normalizeCommentRow)
  type NormalizedComment = (typeof normalized)[number]
  type CommentTreeNode = NormalizedComment & { replies: CommentTreeNode[] }
  const rootComments = normalized.filter((comment) => !comment.parent_id)
  const repliesByParent = normalized.reduce<Record<string, NormalizedComment[]>>((accumulator, comment) => {
    if (!comment.parent_id) {
      return accumulator
    }

    if (!accumulator[comment.parent_id]) {
      accumulator[comment.parent_id] = []
    }

    accumulator[comment.parent_id].push(comment)
    return accumulator
  }, {})

  const enrich = (comment: NormalizedComment): CommentTreeNode => ({
    ...comment,
    replies: (repliesByParent[comment.id] || []).map(enrich),
  })

  return rootComments.map(enrich)
}

export async function getTicketByDisplayId(context: TicketSupportContext, displayId: string) {
  const normalizedDisplayId = displayId.toUpperCase()
  const { data: ticket, error } = await ticketSupportRepository.findTicketByDisplayId(
    context.supabase,
    normalizedDisplayId
  )

  if (error) {
    console.error("Error fetching ticket by display_id:", error)
    throw new HttpError(500, "Failed to fetch ticket")
  }

  if (!ticket) {
    throw new HttpError(404, "Ticket not found")
  }

  return {
    ticket: {
      ...ticket,
      assignee: normalizeUser(ticket.assignee),
      sqa_assignee: normalizeUser(ticket.sqa_assignee),
      requested_by: normalizeUser(ticket.requested_by),
    },
  }
}

export async function getSubtaskCounts(
  context: TicketSupportContext,
  parentTicketIds: string[]
) {
  if (parentTicketIds.length === 0) {
    return { counts: {} }
  }

  const { data, error } = await ticketSupportRepository.findSubtaskParents(
    context.supabase,
    parentTicketIds
  )

  if (error) {
    console.error("Error fetching subtask counts:", error)
    throw new HttpError(500, "Failed to fetch subtask counts")
  }

  const counts: Record<string, number> = {}
  ;(data || []).forEach((row: { parent_ticket_id: string | null }) => {
    if (!row.parent_ticket_id) return
    counts[row.parent_ticket_id] = (counts[row.parent_ticket_id] || 0) + 1
  })

  return { counts }
}

export async function getTicketActivity(context: TicketSupportContext, ticketId: string) {
  const { data: ticket, error: ticketError } = await ticketSupportRepository.findTicketById(
    context.supabase,
    ticketId
  )

  if (ticketError || !ticket) {
    throw new HttpError(404, "Ticket not found")
  }

  const { data, error } = await ticketSupportRepository.listTicketActivity(context.supabase, ticketId)
  if (error) {
    console.error("Error fetching ticket activity:", error)
    throw new HttpError(500, "Failed to fetch ticket activity")
  }

  const activities = (data || []).map((row: Record<string, unknown>) => ({
    ...row,
    actor: Array.isArray(row.actor) ? row.actor[0] ?? null : row.actor ?? null,
  }))

  return { activities }
}

export async function listTicketComments(context: TicketSupportContext, ticketId: string) {
  const [ticketResult, commentsResult] = await Promise.all([
    ticketSupportRepository.findTicketById(context.supabase, ticketId),
    ticketSupportRepository.listTicketComments(context.supabase, ticketId),
  ])

  if (ticketResult.error || !ticketResult.data) {
    throw new HttpError(404, "Ticket not found")
  }

  if (commentsResult.error) {
    console.error("Error fetching comments:", commentsResult.error)
    throw new HttpError(500, "Failed to fetch comments")
  }

  return {
    comments: buildCommentTree((commentsResult.data || []) as CommentRow[]),
    ticket: {
      id: ticketResult.data.id,
      display_id: ticketResult.data.display_id ?? null,
    },
  }
}

export async function createTicketComment(
  context: TicketSupportContext,
  ticketId: string,
  input: CreateCommentInput
) {
  if (isRichTextEmpty(input.body)) {
    throw new HttpError(400, "Comment body is required")
  }

  const uniqueMentions = Array.from(
    new Set((input.mention_user_ids || []).filter((mentionUserId) => mentionUserId !== context.userId))
  )

  const { data: rpcRows, error: rpcError } = await ticketSupportRepository.createCommentWithNotifications(
    context.supabase,
    {
      p_ticket_id: ticketId,
      p_author_id: context.userId,
      p_body: input.body.trim(),
      p_parent_id: input.parent_id || null,
      p_mention_user_ids: uniqueMentions,
    }
  )

  if (rpcError || !Array.isArray(rpcRows) || rpcRows.length === 0) {
    const detail = rpcError?.details || ""
    if (detail === "ticket_not_found") {
      throw new HttpError(404, "Ticket not found")
    }
    if (detail === "parent_comment_not_found") {
      throw new HttpError(400, "Parent comment not found")
    }
    if (detail === "parent_comment_ticket_mismatch") {
      throw new HttpError(400, "Parent comment does not belong to this ticket")
    }

    console.error("Error creating comment via RPC:", rpcError)
    throw new HttpError(500, rpcError?.message || "Failed to create comment")
  }

  const createdRow = rpcRows[0] as {
    comment_id: string
    mention_user_ids: string[] | null
  }

  const { data: comment, error: commentError } = await ticketSupportRepository.findCommentById(
    context.supabase,
    createdRow.comment_id
  )

  if (commentError || !comment) {
    console.error("Error loading created comment:", commentError)
    throw new HttpError(500, "Failed to load created comment")
  }

  const mentionIds = (createdRow.mention_user_ids || []).filter((id) => typeof id === "string")
  let mentionUsersById = new Map<
    string,
    { id: string; name: string | null; email: string; avatar_url?: string | null }
  >()

  if (mentionIds.length > 0) {
    const { data: mentionUsers } = await ticketSupportRepository.findUsersByIds(context.supabase, mentionIds)
    if (Array.isArray(mentionUsers)) {
      mentionUsersById = new Map(mentionUsers.map((user) => [user.id, user]))
    }
  }

  await invalidateTicketCaches()

  return {
    comment: {
      ...comment,
      author: normalizeUser(comment.author),
      mentions: mentionIds.map((user_id) => ({
        user_id,
        user: mentionUsersById.get(user_id),
      })),
      replies: [],
    },
  }
}

export async function updateTicketComment(
  context: TicketSupportContext,
  ticketId: string,
  commentId: string,
  input: UpdateCommentInput
) {
  if (isRichTextEmpty(input.body)) {
    throw new HttpError(400, "Comment body is required")
  }

  const { data: existing } = await ticketSupportRepository.findOwnedComment(
    context.supabase,
    ticketId,
    commentId
  )

  if (!existing) {
    throw new HttpError(404, "Comment not found")
  }

  if (existing.author_id !== context.userId) {
    throw new HttpError(403, "Forbidden")
  }

  const { data: comment, error } = await ticketSupportRepository.updateComment(
    context.supabase,
    commentId,
    input.body.trim()
  )

  if (error) {
    console.error("Error updating comment:", error)
    throw new HttpError(500, error.message || "Failed to update comment")
  }

  await invalidateTicketCaches()
  return {
    comment: {
      ...comment,
      author: normalizeUser(comment.author),
    },
  }
}

export async function deleteTicketComment(
  context: TicketSupportContext,
  ticketId: string,
  commentId: string
) {
  const { data: existing } = await ticketSupportRepository.findOwnedComment(
    context.supabase,
    ticketId,
    commentId
  )

  if (!existing) {
    throw new HttpError(404, "Comment not found")
  }

  if (existing.author_id !== context.userId) {
    throw new HttpError(403, "Forbidden")
  }

  const { error } = await ticketSupportRepository.deleteComment(context.supabase, commentId)
  if (error) {
    console.error("Error deleting comment:", error)
    throw new HttpError(500, error.message || "Failed to delete comment")
  }

  await invalidateTicketCaches()
  return { success: true }
}
