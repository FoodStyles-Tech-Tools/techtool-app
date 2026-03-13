import type { Request, Response } from "express"
import { getRequestContext } from "@server/lib/auth-helpers"
import { handleControllerError } from "@server/http/handle-controller-error"
import * as usersService from "@server/services/users-service"
import {
  parseCreateUserBody,
  parseUpdateUserBody,
  parseUserIdParams,
} from "@server/validation/users"

export async function listUsersController(_request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "users", action: "view" },
    })
    const payload = await usersService.listUsers(context)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/users")
  }
}

export async function getUserController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "users", action: "view" },
    })
    const { id } = parseUserIdParams(request.params)
    const payload = await usersService.getUser(context, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/users/:id")
  }
}

export async function createUserController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "users", action: "create" },
    })
    const payload = await usersService.createUser(context, parseCreateUserBody(request.body))
    response.status(201).json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/users")
  }
}

export async function updateUserController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "users", action: "edit" },
    })
    const { id } = parseUserIdParams(request.params)
    const payload = await usersService.updateUser(context, id, parseUpdateUserBody(request.body))
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/users/:id")
  }
}

export async function deleteUserController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "users", action: "delete" },
    })
    const { id } = parseUserIdParams(request.params)
    const payload = await usersService.deleteUser(context, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in DELETE /api/users/:id")
  }
}
