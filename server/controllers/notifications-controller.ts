import type { Request, Response } from "express"
import { handleControllerError } from "@/server/http/handle-controller-error"
import * as notificationsService from "@/server/services/notifications-service"
import {
  parseLegacyNotificationsQuery,
  parseMarkReadBody,
  parseNotificationIdParams,
  parseV2NotificationsQuery,
} from "@/server/validation/notifications"

export async function listCommentNotificationsController(request: Request, response: Response) {
  try {
    const payload = await notificationsService.listCommentNotifications(
      parseLegacyNotificationsQuery(request.query)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/comment-notifications")
  }
}

export async function markNotificationsReadController(request: Request, response: Response) {
  try {
    const body = parseMarkReadBody(request.body)
    const payload = await notificationsService.markNotificationsRead({
      ids: body.ids,
      ticketId: body.ticketId,
    })
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/comment-notifications/mark-read")
  }
}

export async function markSingleNotificationReadController(request: Request, response: Response) {
  try {
    const { id } = parseNotificationIdParams(request.params)
    const payload = await notificationsService.markSingleNotificationRead(id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/comment-notifications/:id")
  }
}

export async function listV2NotificationsController(request: Request, response: Response) {
  try {
    const payload = await notificationsService.listV2Notifications(
      parseV2NotificationsQuery(request.query)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/v2/notifications")
  }
}
