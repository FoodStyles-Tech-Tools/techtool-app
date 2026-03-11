import { Router } from "express"
import { withRequestContext } from "@server/http/with-request-context"
import {
  batchUpdateLegacyTicketStatusController,
  batchUpdateTicketStatusController,
  createLegacyTicketController,
  createTicketController,
  getLegacyTicketController,
  getLegacyTicketDetailController,
  getTicketDetailController,
  listLegacyTicketsController,
  listTicketsController,
  updateLegacyTicketController,
  updateLegacyTicketStatusWithReasonController,
  updateTicketController,
  updateTicketStatusWithReasonController,
} from "@server/controllers/tickets-controller"
import {
  createTicketCommentController,
  deleteTicketCommentController,
  getTicketActivityController,
  getTicketByDisplayIdController,
  getTicketSubtaskCountsController,
  listTicketCommentsController,
  updateTicketCommentController,
} from "@server/controllers/ticket-support-controller"

export const explicitTicketRouteSignatures = new Set([
  "GET /api/tickets",
  "POST /api/tickets",
  "GET /api/tickets/:id",
  "PATCH /api/tickets/:id",
  "GET /api/tickets/:id/detail",
  "POST /api/tickets/:id/status-with-reason",
  "POST /api/tickets/batch-status",
  "GET /api/v2/tickets",
  "POST /api/v2/tickets",
  "GET /api/v2/tickets/:id",
  "PATCH /api/v2/tickets/:id",
  "POST /api/v2/tickets/:id/status-with-reason",
  "POST /api/v2/tickets/batch-status",
  "GET /api/tickets/by-display-id/:displayId",
  "GET /api/tickets/subtask-counts",
  "GET /api/tickets/:id/activity",
  "GET /api/tickets/:id/comments",
  "POST /api/tickets/:id/comments",
  "PATCH /api/tickets/:id/comments/:commentId",
  "DELETE /api/tickets/:id/comments/:commentId",
])

export function createTicketsRouter() {
  const router = Router()

  router.get("/api/tickets", withRequestContext(listLegacyTicketsController))
  router.post("/api/tickets", withRequestContext(createLegacyTicketController))
  router.post("/api/tickets/batch-status", withRequestContext(batchUpdateLegacyTicketStatusController))
  router.get("/api/tickets/:id", withRequestContext(getLegacyTicketController))
  router.patch("/api/tickets/:id", withRequestContext(updateLegacyTicketController))
  router.get("/api/tickets/:id/detail", withRequestContext(getLegacyTicketDetailController))
  router.post("/api/tickets/:id/status-with-reason", withRequestContext(updateLegacyTicketStatusWithReasonController))
  router.get("/api/v2/tickets", withRequestContext(listTicketsController))
  router.post("/api/v2/tickets", withRequestContext(createTicketController))
  router.post("/api/v2/tickets/batch-status", withRequestContext(batchUpdateTicketStatusController))
  router.get("/api/v2/tickets/:id", withRequestContext(getTicketDetailController))
  router.patch("/api/v2/tickets/:id", withRequestContext(updateTicketController))
  router.post("/api/v2/tickets/:id/status-with-reason", withRequestContext(updateTicketStatusWithReasonController))
  router.get("/api/tickets/by-display-id/:displayId", withRequestContext(getTicketByDisplayIdController))
  router.get("/api/tickets/subtask-counts", withRequestContext(getTicketSubtaskCountsController))
  router.get("/api/tickets/:id/activity", withRequestContext(getTicketActivityController))
  router.get("/api/tickets/:id/comments", withRequestContext(listTicketCommentsController))
  router.post("/api/tickets/:id/comments", withRequestContext(createTicketCommentController))
  router.patch("/api/tickets/:id/comments/:commentId", withRequestContext(updateTicketCommentController))
  router.delete("/api/tickets/:id/comments/:commentId", withRequestContext(deleteTicketCommentController))

  return router
}
