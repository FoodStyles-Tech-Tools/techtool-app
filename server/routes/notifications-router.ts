import { Router } from "express"
import { withRequestContext } from "@/server/http/with-request-context"
import {
  listCommentNotificationsController,
  listV2NotificationsController,
  markNotificationsReadController,
  markSingleNotificationReadController,
} from "@/server/controllers/notifications-controller"

export const explicitNotificationRouteSignatures = new Set([
  "GET /api/comment-notifications",
  "POST /api/comment-notifications/mark-read",
  "PATCH /api/comment-notifications/:id",
  "GET /api/v2/notifications",
])

export function createNotificationsRouter() {
  const router = Router()

  router.get(
    "/api/comment-notifications",
    withRequestContext(listCommentNotificationsController)
  )
  router.post(
    "/api/comment-notifications/mark-read",
    withRequestContext(markNotificationsReadController)
  )
  router.patch(
    "/api/comment-notifications/:id",
    withRequestContext(markSingleNotificationReadController)
  )
  router.get("/api/v2/notifications", withRequestContext(listV2NotificationsController))

  return router
}
