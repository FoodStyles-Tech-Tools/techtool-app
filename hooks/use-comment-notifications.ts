"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"

export type CommentNotificationType = "reply" | "mention"

export interface CommentNotification {
  id: string
  user_id: string
  type: CommentNotificationType
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

const NOTIFICATIONS_QUERY_KEY = ["comment-notifications"] as const

export function useCommentNotifications(options?: { unreadOnly?: boolean }) {
  const queryClient = useQueryClient()

  useRealtimeSubscription({
    table: "comment_notifications",
    enabled: true,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
  })

  const query = useQuery<{
    notifications: CommentNotification[]
    unread_count: number
  }>({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, options?.unreadOnly],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (options?.unreadOnly) params.set("unread_only", "true")
      const res = await fetch(`/api/comment-notifications?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to load notifications")
      }
      return res.json()
    },
  })

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/comment-notifications/${notificationId}`, {
        method: "PATCH",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to mark as read")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/comment-notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to mark all as read")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
  })

  const markTicketRead = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await fetch("/api/comment-notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to mark as read")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
  })

  return {
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unread_count ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    markRead,
    markAllRead,
    markTicketRead,
  }
}
