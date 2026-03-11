import type { Request, Response } from "express"
import { getRequestContext } from "@server/lib/auth-helpers"
import { handleControllerError } from "@server/http/handle-controller-error"
import * as ticketStatusesService from "@server/services/ticket-statuses-service"
import {
  parseCreateTicketStatusBody,
  parseReorderTicketStatusesBody,
  parseTicketStatusKeyParams,
  parseUpdateTicketStatusBody,
} from "@server/validation/ticket-statuses"

export async function listTicketStatusesController(_request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
    })
    const payload = await ticketStatusesService.listTicketStatuses(context)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/ticket-statuses")
  }
}

export async function createTicketStatusController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "status", action: "manage" },
    })
    const payload = await ticketStatusesService.createTicketStatus(
      context,
      parseCreateTicketStatusBody(request.body)
    )
    response.status(201).json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/ticket-statuses")
  }
}

export async function updateTicketStatusController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "status", action: "manage" },
    })
    const { key } = parseTicketStatusKeyParams(request.params)
    const payload = await ticketStatusesService.updateTicketStatus(
      context,
      key,
      parseUpdateTicketStatusBody(request.body)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/ticket-statuses/:key")
  }
}

export async function deleteTicketStatusController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "status", action: "manage" },
    })
    const { key } = parseTicketStatusKeyParams(request.params)
    const payload = await ticketStatusesService.deleteTicketStatus(context, key)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in DELETE /api/ticket-statuses/:key")
  }
}

export async function reorderTicketStatusesController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "status", action: "manage" },
    })
    const payload = await ticketStatusesService.reorderTicketStatuses(
      context,
      parseReorderTicketStatusesBody(request.body).order
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/ticket-statuses/reorder")
  }
}
