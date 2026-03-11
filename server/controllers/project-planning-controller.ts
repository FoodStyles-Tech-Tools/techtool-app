import type { Request, Response } from "express"
import { getRequestContext } from "@/lib/auth-helpers"
import { handleControllerError } from "@server/http/handle-controller-error"
import * as projectPlanningService from "@server/services/project-planning-service"
import {
  parseCreateEpicBody,
  parseCreateSprintBody,
  parseEntityIdParams,
  parseProjectScopedQuery,
  parseUpdateEpicBody,
  parseUpdateSprintBody,
} from "@server/validation/project-planning"

export async function listEpicsController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "view" },
    })
    const { project_id } = parseProjectScopedQuery(request.query)
    const payload = await projectPlanningService.listEpics(context, project_id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/epics")
  }
}

export async function createEpicController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "edit" },
    })
    const payload = await projectPlanningService.createEpic(
      context,
      parseCreateEpicBody(request.body)
    )
    response.status(201).json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/epics")
  }
}

export async function getEpicController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "view" },
    })
    const { id } = parseEntityIdParams(request.params)
    const payload = await projectPlanningService.getEpic(context, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/epics/:id")
  }
}

export async function updateEpicController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "edit" },
    })
    const { id } = parseEntityIdParams(request.params)
    const payload = await projectPlanningService.updateEpic(
      context,
      id,
      parseUpdateEpicBody(request.body)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/epics/:id")
  }
}

export async function deleteEpicController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "edit" },
    })
    const { id } = parseEntityIdParams(request.params)
    const payload = await projectPlanningService.deleteEpic(context, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in DELETE /api/epics/:id")
  }
}

export async function listSprintsController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "view" },
    })
    const { project_id } = parseProjectScopedQuery(request.query)
    const payload = await projectPlanningService.listSprints(context, project_id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/sprints")
  }
}

export async function createSprintController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "edit" },
    })
    const payload = await projectPlanningService.createSprint(
      context,
      parseCreateSprintBody(request.body)
    )
    response.status(201).json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/sprints")
  }
}

export async function getSprintController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "view" },
    })
    const { id } = parseEntityIdParams(request.params)
    const payload = await projectPlanningService.getSprint(context, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/sprints/:id")
  }
}

export async function updateSprintController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "edit" },
    })
    const { id } = parseEntityIdParams(request.params)
    const payload = await projectPlanningService.updateSprint(
      context,
      id,
      parseUpdateSprintBody(request.body)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/sprints/:id")
  }
}

export async function deleteSprintController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "edit" },
    })
    const { id } = parseEntityIdParams(request.params)
    const payload = await projectPlanningService.deleteSprint(context, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in DELETE /api/sprints/:id")
  }
}
