import type { Request, Response } from "express"
import { getRequestContext } from "@server/lib/auth-helpers"
import { handleControllerError } from "@server/http/handle-controller-error"
import * as ticketSupportService from "@server/services/ticket-support-service"
import {
  parseCommentIdParams,
  parseCreateCommentBody,
  parseDisplayIdParams,
  parseSubtaskCountsQuery,
  parseTicketIdParams,
  parseUpdateCommentBody,
} from "@server/validation/ticket-support"

export async function getTicketByDisplayIdController(request: Request, response: Response) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
      requireUserContext: false,
    })
    const { displayId } = parseDisplayIdParams(request.params)
    const payload = await ticketSupportService.getTicketByDisplayId({ supabase, userId }, displayId)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/tickets/by-display-id/:displayId")
  }
}

export async function getTicketSubtaskCountsController(request: Request, response: Response) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
      requireUserContext: false,
    })
    const { ids } = parseSubtaskCountsQuery(request.query)
    const payload = await ticketSupportService.getSubtaskCounts({ supabase, userId }, ids)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/tickets/subtask-counts")
  }
}

export async function getTicketActivityController(request: Request, response: Response) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
    })
    const { id } = parseTicketIdParams(request.params)
    const payload = await ticketSupportService.getTicketActivity({ supabase, userId }, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/tickets/:id/activity")
  }
}

export async function listTicketCommentsController(request: Request, response: Response) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
    })
    const { id } = parseTicketIdParams(request.params)
    const payload = await ticketSupportService.listTicketComments({ supabase, userId }, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/tickets/:id/comments")
  }
}

export async function createTicketCommentController(request: Request, response: Response) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })
    const { id } = parseTicketIdParams(request.params)
    const payload = await ticketSupportService.createTicketComment(
      { supabase, userId },
      id,
      parseCreateCommentBody(request.body)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/tickets/:id/comments")
  }
}

export async function updateTicketCommentController(request: Request, response: Response) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })
    const { id, commentId } = parseCommentIdParams(request.params)
    const payload = await ticketSupportService.updateTicketComment(
      { supabase, userId },
      id,
      commentId,
      parseUpdateCommentBody(request.body)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/tickets/:id/comments/:commentId")
  }
}

export async function deleteTicketCommentController(request: Request, response: Response) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })
    const { id, commentId } = parseCommentIdParams(request.params)
    const payload = await ticketSupportService.deleteTicketComment(
      { supabase, userId },
      id,
      commentId
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in DELETE /api/tickets/:id/comments/:commentId")
  }
}
