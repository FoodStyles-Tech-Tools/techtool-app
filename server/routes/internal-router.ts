import { Router } from "express"
import { withRequestContext } from "@/server/http/with-request-context"
import {
  processDiscordOutboxController,
  revalidateController,
} from "@/server/controllers/internal-controller"

export const explicitInternalRouteSignatures = new Set([
  "POST /api/v2/revalidate",
  "POST /api/internal/discord-outbox/process",
])

export function createInternalRouter() {
  const router = Router()

  router.post("/api/v2/revalidate", withRequestContext(revalidateController))
  router.post(
    "/api/internal/discord-outbox/process",
    withRequestContext(processDiscordOutboxController)
  )

  return router
}
