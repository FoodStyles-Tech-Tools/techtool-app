import { Router } from "express"
import {
  getAuthCallbackController,
  getAuthErrorController,
  getAuthSessionController,
  getBootstrapController,
  getVersionController,
} from "@server/controllers/auth-controller"
import { withRequestContext } from "@server/http/with-request-context"

export const explicitAuthRouteSignatures = new Set([
  "GET /api/auth/me",
  "GET /api/auth/error",
  "GET /auth/callback",
  "GET /api/v2/bootstrap",
  "GET /api/version",
])

export function createAuthRouter() {
  const router = Router()

  router.get("/api/auth/me", withRequestContext(getAuthSessionController))
  router.get("/api/auth/error", withRequestContext(getAuthErrorController))
  router.get("/auth/callback", withRequestContext(getAuthCallbackController))
  router.get("/api/v2/bootstrap", withRequestContext(getBootstrapController))
  router.get("/api/version", withRequestContext(getVersionController))

  return router
}
