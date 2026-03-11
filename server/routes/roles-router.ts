import { Router } from "express"
import { withRequestContext } from "@/server/http/with-request-context"
import {
  createRoleController,
  deleteRoleController,
  getRoleController,
  listRolesController,
  updateRoleController,
} from "@/server/controllers/roles-controller"

export const explicitRoleRouteSignatures = new Set([
  "GET /api/roles",
  "POST /api/roles",
  "GET /api/roles/:id",
  "PATCH /api/roles/:id",
  "DELETE /api/roles/:id",
])

export function createRolesRouter() {
  const router = Router()

  router.get("/api/roles", withRequestContext(listRolesController))
  router.post("/api/roles", withRequestContext(createRoleController))
  router.get("/api/roles/:id", withRequestContext(getRoleController))
  router.patch("/api/roles/:id", withRequestContext(updateRoleController))
  router.delete("/api/roles/:id", withRequestContext(deleteRoleController))

  return router
}
