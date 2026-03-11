import type { Request, Response } from "express"
import { getRequestContext } from "@/lib/auth-helpers"
import { handleControllerError } from "@/server/http/handle-controller-error"
import * as rolesService from "@/server/services/roles-service"
import {
  parseCreateRoleBody,
  parseRoleIdParams,
  parseUpdateRoleBody,
} from "@/server/validation/roles"

export async function listRolesController(_request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "roles", action: "view" },
    })
    const payload = await rolesService.listRoles(context)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/roles")
  }
}

export async function getRoleController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "roles", action: "view" },
    })
    const { id } = parseRoleIdParams(request.params)
    const payload = await rolesService.getRole(context, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/roles/:id")
  }
}

export async function createRoleController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "roles", action: "create" },
    })
    const payload = await rolesService.createRole(context, parseCreateRoleBody(request.body))
    response.status(201).json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/roles")
  }
}

export async function updateRoleController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "roles", action: "edit" },
    })
    const { id } = parseRoleIdParams(request.params)
    const payload = await rolesService.updateRole(context, id, parseUpdateRoleBody(request.body))
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/roles/:id")
  }
}

export async function deleteRoleController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "roles", action: "delete" },
    })
    const { id } = parseRoleIdParams(request.params)
    const payload = await rolesService.deleteRole(context, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in DELETE /api/roles/:id")
  }
}
