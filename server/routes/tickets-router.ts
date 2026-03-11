import { Router } from "express"
import {
  batchUpdateTicketStatusController,
  createTicketController,
  getTicketDetailController,
  listTicketsController,
  updateTicketController,
  updateTicketStatusWithReasonController,
} from "@/server/controllers/tickets-controller"

export const explicitTicketRouteSignatures = new Set([
  "GET /api/v2/tickets",
  "POST /api/v2/tickets",
  "GET /api/v2/tickets/:id",
  "PATCH /api/v2/tickets/:id",
  "POST /api/v2/tickets/:id/status-with-reason",
  "POST /api/v2/tickets/batch-status",
])

export function createTicketsRouter() {
  const router = Router()

  router.get("/api/v2/tickets", listTicketsController)
  router.post("/api/v2/tickets", createTicketController)
  router.post("/api/v2/tickets/batch-status", batchUpdateTicketStatusController)
  router.get("/api/v2/tickets/:id", getTicketDetailController)
  router.patch("/api/v2/tickets/:id", updateTicketController)
  router.post("/api/v2/tickets/:id/status-with-reason", updateTicketStatusWithReasonController)

  return router
}
