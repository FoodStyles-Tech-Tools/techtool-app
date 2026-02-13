"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"

export interface CommentAuthor {
  id: string
  name: string | null
  email: string
}

export interface CommentMention {
  user_id: string
  user?: CommentAuthor
}

export interface TicketComment {
  id: string
  ticket_id: string
  parent_id: string | null
  author_id: string
  body: string
  created_at: string
  updated_at: string
  author: CommentAuthor
  mentions: CommentMention[]
  replies: TicketComment[]
}

interface CommentsResponse {
  comments: TicketComment[]
  ticket: { id: string; display_id: string | null }
}

function getCommentsQueryKey(ticketId: string) {
  return ["ticket-comments", ticketId] as const
}

function updateCommentInTree(
  comments: TicketComment[],
  commentId: string,
  updater: (comment: TicketComment) => TicketComment
): TicketComment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return updater(comment)
    }
    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: updateCommentInTree(comment.replies, commentId, updater),
      }
    }
    return comment
  })
}

function removeCommentFromTree(
  comments: TicketComment[],
  commentId: string
): TicketComment[] {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({
      ...comment,
      replies: comment.replies ? removeCommentFromTree(comment.replies, commentId) : [],
    }))
}

function commentExistsInTree(comments: TicketComment[], commentId: string): boolean {
  for (const comment of comments) {
    if (comment.id === commentId) return true
    if (comment.replies?.length && commentExistsInTree(comment.replies, commentId)) {
      return true
    }
  }
  return false
}

export function useTicketComments(ticketId: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient()
  const enabled = !!ticketId && (options?.enabled !== false)

  useRealtimeSubscription({
    table: "ticket_comments",
    filter: `ticket_id=eq.${ticketId}`,
    enabled,
    onInsert: (payload) => {
      const insertedCommentId = (payload.new as { id: string }).id
      const existing = queryClient.getQueryData<CommentsResponse>(getCommentsQueryKey(ticketId))
      const alreadyExists = existing ? commentExistsInTree(existing.comments, insertedCommentId) : false

      if (!alreadyExists) {
        queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(ticketId) })
      }
    },
    onUpdate: (payload) => {
      const updatedComment = payload.new as any
      if (updatedComment.ticket_id === ticketId) {
        queryClient.setQueryData<CommentsResponse>(getCommentsQueryKey(ticketId), (old) => {
          if (!old) return old
          return {
            ...old,
            comments: updateCommentInTree(old.comments, updatedComment.id, (comment) => ({
              ...comment,
              body: updatedComment.body,
              updated_at: updatedComment.updated_at,
            })),
          }
        })
      }
    },
    onDelete: (payload) => {
      const deletedId = (payload.old as { id: string }).id
      queryClient.setQueryData<CommentsResponse>(getCommentsQueryKey(ticketId), (old) => {
        if (!old) return old
        return { ...old, comments: removeCommentFromTree(old.comments, deletedId) }
      })
    },
  })

  const query = useQuery<CommentsResponse>({
    queryKey: getCommentsQueryKey(ticketId),
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${ticketId}/comments`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to load comments")
      }
      return res.json()
    },
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  const addComment = useMutation({
    mutationFn: async (payload: {
      body: string
      parent_id?: string | null
      mention_user_ids?: string[]
    }) => {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to add comment")
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData<CommentsResponse>(getCommentsQueryKey(ticketId), (old) => {
        if (!old) return old
        if (data.comment.parent_id) {
          const updatedComments = old.comments.map((c) => {
            if (c.id === data.comment.parent_id) {
              return { ...c, replies: [...(c.replies || []), data.comment] }
            }
            if (c.replies?.some((r) => r.id === data.comment.parent_id)) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === data.comment.parent_id
                    ? { ...r, replies: [...(r.replies || []), data.comment] }
                    : r
                ),
              }
            }
            return c
          })
          return { ...old, comments: updatedComments }
        } else {
          return { ...old, comments: [...old.comments, data.comment] }
        }
      })
    },
  })

  const updateComment = useMutation({
    mutationFn: async ({
      commentId,
      body,
    }: {
      commentId: string
      body: string
    }) => {
      const res = await fetch(`/api/tickets/${ticketId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to update comment")
      }
      return res.json()
    },
    onSuccess: (data) => {
      const updatedComment = data?.comment as TicketComment | undefined
      if (!updatedComment) return
      queryClient.setQueryData<CommentsResponse>(getCommentsQueryKey(ticketId), (old) => {
        if (!old) return old
        return {
          ...old,
          comments: updateCommentInTree(old.comments, updatedComment.id, (comment) => ({
            ...comment,
            body: updatedComment.body,
            updated_at: updatedComment.updated_at,
          })),
        }
      })
    },
  })

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/tickets/${ticketId}/comments/${commentId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to delete comment")
      }
    },
    onSuccess: (_, commentId) => {
      queryClient.setQueryData<CommentsResponse>(getCommentsQueryKey(ticketId), (old) => {
        if (!old) return old
        return { ...old, comments: removeCommentFromTree(old.comments, commentId) }
      })
    },
  })

  return {
    comments: query.data?.comments ?? [],
    ticket: query.data?.ticket ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addComment,
    updateComment,
    deleteComment,
  }
}
