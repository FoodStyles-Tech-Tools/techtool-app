import { Router } from "express"
import { withRequestContext } from "@/server/http/with-request-context"
import {
  createEpicController,
  createSprintController,
  deleteEpicController,
  deleteSprintController,
  getEpicController,
  getSprintController,
  listEpicsController,
  listSprintsController,
  updateEpicController,
  updateSprintController,
} from "@/server/controllers/project-planning-controller"

export const explicitProjectPlanningRouteSignatures = new Set([
  "GET /api/epics",
  "POST /api/epics",
  "GET /api/epics/:id",
  "PATCH /api/epics/:id",
  "DELETE /api/epics/:id",
  "GET /api/sprints",
  "POST /api/sprints",
  "GET /api/sprints/:id",
  "PATCH /api/sprints/:id",
  "DELETE /api/sprints/:id",
])

export function createProjectPlanningRouter() {
  const router = Router()

  router.get("/api/epics", withRequestContext(listEpicsController))
  router.post("/api/epics", withRequestContext(createEpicController))
  router.get("/api/epics/:id", withRequestContext(getEpicController))
  router.patch("/api/epics/:id", withRequestContext(updateEpicController))
  router.delete("/api/epics/:id", withRequestContext(deleteEpicController))

  router.get("/api/sprints", withRequestContext(listSprintsController))
  router.post("/api/sprints", withRequestContext(createSprintController))
  router.get("/api/sprints/:id", withRequestContext(getSprintController))
  router.patch("/api/sprints/:id", withRequestContext(updateSprintController))
  router.delete("/api/sprints/:id", withRequestContext(deleteSprintController))

  return router
}
