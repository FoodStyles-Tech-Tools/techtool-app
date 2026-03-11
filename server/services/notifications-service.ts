import { getSupabaseWithUserContext } from "@/lib/auth-helpers"
import * as notificationsRepository from "@/server/repositories/notifications-repository"
import { HttpError } from "@/server/http/http-error"
import type { CursorPage } from "@/types/api/common"

export async function listCommentNotifications(input: { unreadOnly: boolean; limit: number }) {
  const { supabase, userId } = await getSupabaseWithUserContext()
  const [notifications, unreadCount] = await Promise.all([
    notificationsRepository.listCommentNotifications(supabase, {
      userId,
      unreadOnly: input.unreadOnly,
      limit: input.limit,
    }),
    notificationsRepository.countUnreadNotifications(supabase, userId),
  ])

  return {
    notifications,
    unread_count: unreadCount,
  }
}

export async function markNotificationsRead(input: {
  ids?: string[]
  ticketId?: string | null
}) {
  const { supabase, userId } = await getSupabaseWithUserContext()
  await notificationsRepository.markNotificationsRead(supabase, {
    userId,
    ids: input.ids,
    ticketId: input.ticketId,
  })

  return { success: true }
}

export async function markSingleNotificationRead(notificationId: string) {
  const { supabase, userId } = await getSupabaseWithUserContext()
  const existing = await notificationsRepository.getCommentNotificationById(supabase, notificationId)

  if (!existing) {
    throw new HttpError(404, "Notification not found")
  }
  if (existing.user_id !== userId) {
    throw new HttpError(403, "Forbidden")
  }

  const notification = await notificationsRepository.markCommentNotificationReadById(
    supabase,
    notificationId
  )

  return { notification }
}

type V2NotificationPayload = CursorPage<notificationsRepository.CommentNotification> & {
  unread_count: number
}

export async function listV2Notifications(input: {
  cursor: string | null
  unreadOnly: boolean
  limit: number
}): Promise<V2NotificationPayload> {
  const { supabase, userId } = await getSupabaseWithUserContext()
  const [page, unreadCount] = await Promise.all([
    notificationsRepository.listV2CommentNotifications(supabase, {
      userId,
      cursor: input.cursor,
      unreadOnly: input.unreadOnly,
      limit: input.limit,
    }),
    notificationsRepository.countUnreadNotifications(supabase, userId),
  ])

  return {
    data: page.data,
    nextCursor: page.nextCursor,
    unread_count: unreadCount,
  }
}
