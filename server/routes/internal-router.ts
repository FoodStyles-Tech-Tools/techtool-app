import { Router } from "express"
import { withRequestContext } from "@server/http/with-request-context"
import { revalidateController } from "@server/controllers/internal-controller"

export const explicitInternalRouteSignatures = new Set([
  "POST /api/v2/revalidate",
])

export function createInternalRouter() {
  const router = Router()

  router.post("/api/v2/revalidate", withRequestContext(revalidateController))

  return router
}
