import { Router } from "express"
import { withRequestContext } from "@/server/http/with-request-context"
import {
  createReportSessionController,
  deleteReportSessionController,
  getReportSessionController,
  getReportSessionDataController,
  listReportSessionsController,
  updateReportSessionController,
} from "@/server/controllers/report-sessions-controller"

export const explicitReportSessionRouteSignatures = new Set([
  "GET /api/report/sessions",
  "POST /api/report/sessions",
  "GET /api/report/sessions/:id",
  "PATCH /api/report/sessions/:id",
  "DELETE /api/report/sessions/:id",
  "GET /api/report/sessions/:id/data",
])

export function createReportSessionsRouter() {
  const router = Router()

  router.get("/api/report/sessions", withRequestContext(listReportSessionsController))
  router.post("/api/report/sessions", withRequestContext(createReportSessionController))
  router.get("/api/report/sessions/:id", withRequestContext(getReportSessionController))
  router.patch("/api/report/sessions/:id", withRequestContext(updateReportSessionController))
  router.delete("/api/report/sessions/:id", withRequestContext(deleteReportSessionController))
  router.get("/api/report/sessions/:id/data", withRequestContext(getReportSessionDataController))

  return router
}
