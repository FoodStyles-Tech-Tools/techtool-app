import { Router } from "express"
import { withRequestContext } from "@/server/http/with-request-context"
import {
  createProjectController,
  deleteProjectController,
  getProjectController,
  listPinnedProjectsController,
  listProjectsController,
  updateProjectController,
} from "@/server/controllers/projects-controller"

export const explicitProjectRouteSignatures = new Set([
  "GET /api/projects",
  "POST /api/projects",
  "GET /api/projects/pinned",
  "GET /api/projects/:id",
  "PATCH /api/projects/:id",
  "DELETE /api/projects/:id",
])

export function createProjectsRouter() {
  const router = Router()

  router.get("/api/projects", withRequestContext(listProjectsController))
  router.post("/api/projects", withRequestContext(createProjectController))
  router.get("/api/projects/pinned", withRequestContext(listPinnedProjectsController))
  router.get("/api/projects/:id", withRequestContext(getProjectController))
  router.patch("/api/projects/:id", withRequestContext(updateProjectController))
  router.delete("/api/projects/:id", withRequestContext(deleteProjectController))

  return router
}
