"use client"

import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"
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
type NotificationsResponse = {
  notifications: CommentNotification[]
  unread_count: number
}

function recalculateUnreadCount(notifications: CommentNotification[]) {
  return notifications.reduce((count, notification) => {
    return notification.read_at ? count : count + 1
  }, 0)
}

function updateNotificationQueries(
  queryClient: QueryClient,
  updater: (
    current: NotificationsResponse,
    unreadOnly: boolean
  ) => NotificationsResponse
) {
  const entries = queryClient.getQueriesData<NotificationsResponse>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
  })

  for (const [queryKey, current] of entries) {
    if (!current) continue
    const unreadOnly = Array.isArray(queryKey) && queryKey[1] === true
    const next = updater(current, unreadOnly)
    queryClient.setQueryData(queryKey, next)
  }
}

function mergeRealtimeNotification(
  existing: CommentNotification[],
  incoming: CommentNotification,
  unreadOnly: boolean
) {
  const index = existing.findIndex((notification) => notification.id === incoming.id)

  if (unreadOnly && incoming.read_at) {
    if (index === -1) return existing
    return existing.filter((notification) => notification.id !== incoming.id)
  }

  if (index === -1) {
    return [incoming, ...existing]
  }

  const next = [...existing]
  next[index] = { ...next[index], ...incoming }
  return next
}

export function useCommentNotifications(options?: { unreadOnly?: boolean }) {
  const queryClient = useQueryClient()

  useRealtimeSubscription({
    table: "comment_notifications",
    enabled: true,
    onInsert: (payload) => {
      const created = payload.new as CommentNotification
      updateNotificationQueries(queryClient, (current, unreadOnly) => {
        const nextNotifications = mergeRealtimeNotification(
          current.notifications,
          created,
          unreadOnly
        )
        return {
          notifications: nextNotifications,
          unread_count: recalculateUnreadCount(nextNotifications),
        }
      })
      queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
        refetchType: "active",
      })
    },
    onUpdate: (payload) => {
      const updated = payload.new as CommentNotification
      updateNotificationQueries(queryClient, (current, unreadOnly) => {
        const nextNotifications = mergeRealtimeNotification(
          current.notifications,
          updated,
          unreadOnly
        )
        return {
          notifications: nextNotifications,
          unread_count: recalculateUnreadCount(nextNotifications),
        }
      })
    },
    onDelete: (payload) => {
      const deletedId = (payload.old as { id: string }).id
      updateNotificationQueries(queryClient, (current) => {
        const nextNotifications = current.notifications.filter(
          (notification) => notification.id !== deletedId
        )
        return {
          notifications: nextNotifications,
          unread_count: recalculateUnreadCount(nextNotifications),
        }
      })
    },
  })

  const query = useQuery<NotificationsResponse>({
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
    staleTime: 30 * 1000,
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
    onSuccess: (data) => {
      const updated = data?.notification as CommentNotification | undefined
      if (!updated) return
      updateNotificationQueries(queryClient, (current, unreadOnly) => {
        const nextNotifications = mergeRealtimeNotification(
          current.notifications,
          updated,
          unreadOnly
        )
        return {
          notifications: nextNotifications,
          unread_count: recalculateUnreadCount(nextNotifications),
        }
      })
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
      const readAt = new Date().toISOString()
      updateNotificationQueries(queryClient, (current, unreadOnly) => {
        if (unreadOnly) {
          return {
            notifications: [],
            unread_count: 0,
          }
        }
        const notifications = current.notifications.map((notification) => ({
          ...notification,
          read_at: notification.read_at ?? readAt,
        }))
        return {
          notifications,
          unread_count: 0,
        }
      })
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
    onSuccess: (_, ticketId) => {
      const readAt = new Date().toISOString()
      updateNotificationQueries(queryClient, (current, unreadOnly) => {
        const notifications = current.notifications
          .map((notification) => {
            if (notification.ticket_id !== ticketId) {
              return notification
            }
            return {
              ...notification,
              read_at: notification.read_at ?? readAt,
            }
          })
          .filter((notification) => (unreadOnly ? !notification.read_at : true))

        return {
          notifications,
          unread_count: recalculateUnreadCount(notifications),
        }
      })
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
