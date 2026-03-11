import type { Request, Response } from "express"
import { getRequestContext } from "@/lib/auth-helpers"
import { handleControllerError } from "@server/http/handle-controller-error"
import * as metaService from "@server/services/meta-service"
import {
  parseCreateDepartmentBody,
  parseUpdateUserPreferencesBody,
} from "@server/validation/meta"

export async function listDepartmentsController(_request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "view" },
    })
    const payload = await metaService.listDepartments(context)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/departments")
  }
}

export async function createDepartmentController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "edit" },
    })
    const { name } = parseCreateDepartmentBody(request.body)
    const payload = await metaService.createDepartment(context, name)
    response.status(201).json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/departments")
  }
}

export async function getUserPreferencesController(_request: Request, response: Response) {
  try {
    const payload = await metaService.getUserPreferences()
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/user-preferences")
  }
}

export async function updateUserPreferencesController(request: Request, response: Response) {
  try {
    const payload = await metaService.updateUserPreferences(
      parseUpdateUserPreferencesBody(request.body)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/user-preferences")
  }
}
