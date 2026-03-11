import { Router } from "express"
import { withRequestContext } from "@server/http/with-request-context"
import {
  createUserController,
  deleteUserController,
  getUserController,
  listUsersController,
  updateUserController,
} from "@server/controllers/users-controller"

export const explicitUserRouteSignatures = new Set([
  "GET /api/users",
  "POST /api/users",
  "GET /api/users/:id",
  "PATCH /api/users/:id",
  "DELETE /api/users/:id",
])

export function createUsersRouter() {
  const router = Router()

  router.get("/api/users", withRequestContext(listUsersController))
  router.post("/api/users", withRequestContext(createUserController))
  router.get("/api/users/:id", withRequestContext(getUserController))
  router.patch("/api/users/:id", withRequestContext(updateUserController))
  router.delete("/api/users/:id", withRequestContext(deleteUserController))

  return router
}
