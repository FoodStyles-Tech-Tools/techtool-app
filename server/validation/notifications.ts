import { z } from "zod"

const legacyNotificationsQuerySchema = z.object({
  unread_only: z.string().optional(),
  limit: z.string().optional(),
})

const v2NotificationsQuerySchema = z.object({
  cursor: z.string().optional(),
  unread_only: z.string().optional(),
  limit: z.string().optional(),
})

const markReadBodySchema = z.object({
  ids: z.array(z.unknown()).optional(),
  ticket_id: z.unknown().optional(),
})

const notificationIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Notification id is required"),
})

export function parseLegacyNotificationsQuery(input: unknown) {
  const parsed = legacyNotificationsQuerySchema.parse(input)
  const limitRaw = Number.parseInt(parsed.limit || "50", 10)
  const limit = Number.isNaN(limitRaw) ? 50 : Math.min(limitRaw, 100)

  return {
    unreadOnly: parsed.unread_only === "true",
    limit,
  }
}

export function parseV2NotificationsQuery(input: unknown) {
  const parsed = v2NotificationsQuerySchema.parse(input)
  const limitRaw = Number(parsed.limit || 50)
  const boundedLimit = Number.isFinite(limitRaw) ? limitRaw : 50

  return {
    cursor: parsed.cursor || null,
    unreadOnly: parsed.unread_only === "true",
    limit: Math.min(Math.max(boundedLimit, 1), 100),
  }
}

export function parseMarkReadBody(input: unknown) {
  const parsed = markReadBodySchema.parse(input)
  const ids = Array.isArray(parsed.ids)
    ? parsed.ids.filter((id): id is string => typeof id === "string")
    : []

  return {
    ids,
    ticketId: typeof parsed.ticket_id === "string" && parsed.ticket_id ? parsed.ticket_id : null,
  }
}

export function parseNotificationIdParams(input: unknown) {
  return notificationIdParamsSchema.parse(input)
}
