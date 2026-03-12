import { Router } from "express"
import { withRequestContext } from "@server/http/with-request-context"
import {
  createClockifySessionController,
  deleteClockifySessionController,
  getClockifySessionController,
  getClockifySettingsController,
  listClockifySessionsController,
  reconcileClockifyTicketsController,
  searchClockifyTicketsController,
  updateClockifySessionController,
  updateClockifySettingsController,
} from "@server/controllers/clockify-controller"

export const explicitClockifyRouteSignatures = new Set([
  "GET /api/clockify/sessions",
  "GET /api/clockify/sessions/:sessionId",
  "POST /api/clockify/sessions",
  "PATCH /api/clockify/sessions",
  "DELETE /api/clockify/sessions",
  "GET /api/clockify/settings",
  "PATCH /api/clockify/settings",
  "GET /api/clockify/tickets",
  "POST /api/clockify/reconcile",
])

export function createClockifyRouter() {
  const router = Router()

  router.get("/api/clockify/sessions", withRequestContext(listClockifySessionsController))
  router.get("/api/clockify/sessions/:sessionId", withRequestContext(getClockifySessionController))
  router.post("/api/clockify/sessions", withRequestContext(createClockifySessionController))
  router.patch("/api/clockify/sessions", withRequestContext(updateClockifySessionController))
  router.delete("/api/clockify/sessions", withRequestContext(deleteClockifySessionController))
  router.get("/api/clockify/settings", withRequestContext(getClockifySettingsController))
  router.patch("/api/clockify/settings", withRequestContext(updateClockifySettingsController))
  router.get("/api/clockify/tickets", withRequestContext(searchClockifyTicketsController))
  router.post("/api/clockify/reconcile", withRequestContext(reconcileClockifyTicketsController))

  return router
}
