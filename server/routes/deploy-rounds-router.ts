import { Router } from "express"
import { withRequestContext } from "@server/http/with-request-context"
import {
  listDeployRoundsController,
  getDeployRoundController,
  createDeployRoundController,
  updateDeployRoundController,
  deleteDeployRoundController,
} from "@server/controllers/deploy-rounds-controller"

export const explicitDeployRoundRouteSignatures = new Set([
  "GET /api/v2/projects/:projectId/deploy-rounds",
  "GET /api/v2/projects/:projectId/deploy-rounds/:deployRoundId",
  "POST /api/v2/projects/:projectId/deploy-rounds",
  "PATCH /api/v2/projects/:projectId/deploy-rounds/:deployRoundId",
  "DELETE /api/v2/projects/:projectId/deploy-rounds/:deployRoundId",
])

export function createDeployRoundsRouter() {
  const router = Router()

  router.get("/api/v2/projects/:projectId/deploy-rounds", withRequestContext(listDeployRoundsController))
  router.get("/api/v2/projects/:projectId/deploy-rounds/:deployRoundId", withRequestContext(getDeployRoundController))
  router.post("/api/v2/projects/:projectId/deploy-rounds", withRequestContext(createDeployRoundController))
  router.patch("/api/v2/projects/:projectId/deploy-rounds/:deployRoundId", withRequestContext(updateDeployRoundController))
  router.delete("/api/v2/projects/:projectId/deploy-rounds/:deployRoundId", withRequestContext(deleteDeployRoundController))

  return router
}
