import type { Request, Response } from "express"
import { getRequestContext } from "@server/lib/auth-helpers"
import { handleControllerError } from "@server/http/handle-controller-error"
import { HttpError } from "@server/http/http-error"
import * as deployRoundsService from "@server/services/deploy-rounds-service"
import {
  parseProjectIdParams,
  parseDeployRoundIdParams,
  parseCreateDeployRoundBody,
  parseUpdateDeployRoundBody,
} from "@server/validation/deploy-rounds"

export async function listDeployRoundsController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "view" },
    })
    const { projectId } = parseProjectIdParams(request.params)
    const payload = await deployRoundsService.listDeployRounds(context, projectId)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/v2/projects/:projectId/deploy-rounds")
  }
}

export async function getDeployRoundController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "view" },
    })
    const { projectId, deployRoundId } = parseDeployRoundIdParams(request.params)
    const payload = await deployRoundsService.getDeployRound(context, projectId, deployRoundId)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/v2/projects/:projectId/deploy-rounds/:deployRoundId")
  }
}

export async function createDeployRoundController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "edit" },
    })
    const { projectId } = parseProjectIdParams(request.params)
    const payload = await deployRoundsService.createDeployRound(
      context,
      projectId,
      parseCreateDeployRoundBody(request.body)
    )
    response.status(201).json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/v2/projects/:projectId/deploy-rounds")
  }
}

export async function updateDeployRoundController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "edit" },
    })
    const { projectId, deployRoundId } = parseDeployRoundIdParams(request.params)
    const payload = await deployRoundsService.updateDeployRound(
      context,
      projectId,
      deployRoundId,
      parseUpdateDeployRoundBody(request.body)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/v2/projects/:projectId/deploy-rounds/:deployRoundId")
  }
}

export async function deleteDeployRoundController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "projects", action: "edit" },
    })
    const { projectId, deployRoundId } = parseDeployRoundIdParams(request.params)
    const payload = await deployRoundsService.deleteDeployRound(context, projectId, deployRoundId)
    response.json(payload)
  } catch (error) {
    if (error instanceof HttpError && error.status === 409 && error.headers?.["x-has-tickets"]) {
      response.status(409).json({
        error: error.message,
        hasTickets: true,
      })
      return
    }

    handleControllerError(response, error, "Error in DELETE /api/v2/projects/:projectId/deploy-rounds/:deployRoundId")
  }
}
