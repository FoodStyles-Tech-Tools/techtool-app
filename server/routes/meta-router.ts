import { Router } from "express"
import { withRequestContext } from "@server/http/with-request-context"
import {
  createDepartmentController,
  getUserPreferencesController,
  listDepartmentsController,
  updateUserPreferencesController,
} from "@server/controllers/meta-controller"

export const explicitMetaRouteSignatures = new Set([
  "GET /api/departments",
  "POST /api/departments",
  "GET /api/user-preferences",
  "PATCH /api/user-preferences",
])

export function createMetaRouter() {
  const router = Router()

  router.get("/api/departments", withRequestContext(listDepartmentsController))
  router.post("/api/departments", withRequestContext(createDepartmentController))
  router.get("/api/user-preferences", withRequestContext(getUserPreferencesController))
  router.patch("/api/user-preferences", withRequestContext(updateUserPreferencesController))

  return router
}
