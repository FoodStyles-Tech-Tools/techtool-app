import { Router } from "express"
import { withRequestContext } from "@server/http/with-request-context"
import { getAuditLogController } from "@server/controllers/audit-log-controller"

export const explicitAuditLogRouteSignatures = new Set([
  "GET /api/audit-log",
])

export function createAuditLogRouter() {
  const router = Router()
  router.get("/api/audit-log", withRequestContext(getAuditLogController))
  return router
}
