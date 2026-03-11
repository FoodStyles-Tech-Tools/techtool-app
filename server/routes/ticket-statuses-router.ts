import { Router } from "express"
import { withRequestContext } from "@/server/http/with-request-context"
import {
  createTicketStatusController,
  deleteTicketStatusController,
  listTicketStatusesController,
  reorderTicketStatusesController,
  updateTicketStatusController,
} from "@/server/controllers/ticket-statuses-controller"

export const explicitTicketStatusRouteSignatures = new Set([
  "GET /api/ticket-statuses",
  "POST /api/ticket-statuses",
  "PATCH /api/ticket-statuses/:key",
  "DELETE /api/ticket-statuses/:key",
  "POST /api/ticket-statuses/reorder",
])

export function createTicketStatusesRouter() {
  const router = Router()

  router.get("/api/ticket-statuses", withRequestContext(listTicketStatusesController))
  router.post("/api/ticket-statuses", withRequestContext(createTicketStatusController))
  router.post("/api/ticket-statuses/reorder", withRequestContext(reorderTicketStatusesController))
  router.patch("/api/ticket-statuses/:key", withRequestContext(updateTicketStatusController))
  router.delete("/api/ticket-statuses/:key", withRequestContext(deleteTicketStatusController))

  return router
}
