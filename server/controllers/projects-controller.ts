import type { Request, Response } from "express"
import { getRequestContext } from "@/lib/auth-helpers"
import { handleControllerError } from "@/server/http/handle-controller-error"
import { HttpError } from "@/server/http/http-error"
import * as projectsService from "@/server/services/projects-service"
import {
  parseCreateProjectBody,
  parseDeleteProjectQuery,
  parsePinnedProjectsQuery,
  parseProjectIdParams,
  parseProjectListQuery,
  parseUpdateProjectBody,
} from "@/server/validation/projects"

export async function listProjectsController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "view" },
    })
    const payload = await projectsService.listProjects(context, parseProjectListQuery(request.query))
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/projects")
  }
}

export async function createProjectController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "create" },
    })
    const payload = await projectsService.createProject(context, parseCreateProjectBody(request.body))
    response.status(201).json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/projects")
  }
}

export async function getProjectController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "view" },
    })
    const { id } = parseProjectIdParams(request.params)
    const payload = await projectsService.getProject(context, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/projects/:id")
  }
}

export async function updateProjectController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "edit" },
    })
    const { id } = parseProjectIdParams(request.params)
    const payload = await projectsService.updateProject(
      context,
      id,
      parseUpdateProjectBody(request.body)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/projects/:id")
  }
}

export async function deleteProjectController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "delete" },
    })
    const { id } = parseProjectIdParams(request.params)
    const payload = await projectsService.deleteProject(
      context,
      id,
      parseDeleteProjectQuery(request.query)
    )
    response.json(payload)
  } catch (error) {
    if (error instanceof HttpError && error.status === 400 && error.headers?.["x-ticket-count"]) {
      response.status(400).json({
        error: error.message,
        ticketCount: Number(error.headers["x-ticket-count"]),
      })
      return
    }

    handleControllerError(response, error, "Error in DELETE /api/projects/:id")
  }
}

export async function listPinnedProjectsController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "view" },
    })
    const payload = await projectsService.listPinnedProjects(
      context,
      parsePinnedProjectsQuery(request.query).ids
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/projects/pinned")
  }
}
