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

export function useTicketComments(ticketId: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient()
  const enabled = !!ticketId && (options?.enabled !== false)

  useRealtimeSubscription({
    table: "ticket_comments",
    filter: `ticket_id=eq.${ticketId}`,
    enabled,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(ticketId) })
    },
    onUpdate: (payload) => {
      const updatedComment = payload.new as any
      if (updatedComment.ticket_id === ticketId) {
        queryClient.setQueryData<CommentsResponse>(getCommentsQueryKey(ticketId), (old) => {
          if (!old) return old
          const updateInTree = (comments: TicketComment[]): TicketComment[] => {
            return comments.map((c) => {
              if (c.id === updatedComment.id) {
                return { ...c, body: updatedComment.body, updated_at: updatedComment.updated_at }
              }
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: updateInTree(c.replies) }
              }
              return c
            })
          }
          return { ...old, comments: updateInTree(old.comments) }
        })
      }
    },
    onDelete: (payload) => {
      const deletedId = (payload.old as { id: string }).id
      queryClient.setQueryData<CommentsResponse>(getCommentsQueryKey(ticketId), (old) => {
        if (!old) return old
        const removeFromTree = (comments: TicketComment[]): TicketComment[] => {
          return comments
            .filter((c) => c.id !== deletedId)
            .map((c) => ({
              ...c,
              replies: c.replies ? removeFromTree(c.replies) : [],
            }))
        }
        return { ...old, comments: removeFromTree(old.comments) }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(ticketId) })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(ticketId) })
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
