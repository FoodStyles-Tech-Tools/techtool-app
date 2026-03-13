import { Router } from "express"
import { withRequestContext } from "@server/http/with-request-context"
import {
  createAssetController,
  deleteAssetController,
  listAssetsController,
  updateAssetController,
} from "@server/controllers/assets-controller"

export const explicitAssetRouteSignatures = new Set([
  "GET /api/assets",
  "POST /api/assets",
  "PATCH /api/assets/:id",
  "DELETE /api/assets/:id",
])

export function createAssetsRouter() {
  const router = Router()

  router.get("/api/assets", withRequestContext(listAssetsController))
  router.post("/api/assets", withRequestContext(createAssetController))
  router.patch("/api/assets/:id", withRequestContext(updateAssetController))
  router.delete("/api/assets/:id", withRequestContext(deleteAssetController))

  return router
}
