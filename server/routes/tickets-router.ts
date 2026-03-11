import { Router } from "express"
import {
  batchUpdateTicketStatusController,
  createTicketController,
  getTicketDetailController,
  listTicketsController,
  updateTicketController,
  updateTicketStatusWithReasonController,
} from "@/server/controllers/tickets-controller"
import {
  createTicketCommentController,
  deleteTicketCommentController,
  getTicketActivityController,
  getTicketByDisplayIdController,
  getTicketSubtaskCountsController,
  listTicketCommentsController,
  updateTicketCommentController,
} from "@/server/controllers/ticket-support-controller"

export const explicitTicketRouteSignatures = new Set([
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

  router.get("/api/v2/tickets", listTicketsController)
  router.post("/api/v2/tickets", createTicketController)
  router.post("/api/v2/tickets/batch-status", batchUpdateTicketStatusController)
  router.get("/api/v2/tickets/:id", getTicketDetailController)
  router.patch("/api/v2/tickets/:id", updateTicketController)
  router.post("/api/v2/tickets/:id/status-with-reason", updateTicketStatusWithReasonController)
  router.get("/api/tickets/by-display-id/:displayId", getTicketByDisplayIdController)
  router.get("/api/tickets/subtask-counts", getTicketSubtaskCountsController)
  router.get("/api/tickets/:id/activity", getTicketActivityController)
  router.get("/api/tickets/:id/comments", listTicketCommentsController)
  router.post("/api/tickets/:id/comments", createTicketCommentController)
  router.patch("/api/tickets/:id/comments/:commentId", updateTicketCommentController)
  router.delete("/api/tickets/:id/comments/:commentId", deleteTicketCommentController)

  return router
}
