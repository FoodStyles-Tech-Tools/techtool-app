import type { Request, Response } from "express"
import { getRequestContext } from "@/lib/auth-helpers"
import { handleControllerError } from "@server/http/handle-controller-error"
import * as clockifyService from "@server/services/clockify-service"
import {
  parseClockifyReconcileBody,
  parseClockifySessionsQuery,
  parseClockifyTicketSearchQuery,
  parseCreateClockifySessionBody,
  parseDeleteClockifySessionQuery,
  parseUpdateClockifySessionBody,
  parseUpdateClockifySettingsBody,
} from "@server/validation/clockify"

export async function listClockifySessionsController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "clockify", action: "view" },
    })
    const payload = await clockifyService.listClockifySessions(
      context,
      parseClockifySessionsQuery(request.query)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/clockify/sessions")
  }
}

export async function createClockifySessionController(request: Request, response: Response) {
  try {
    const body = parseCreateClockifySessionBody(request.body)
    const context = await getRequestContext(
      body.clearSessions
        ? { permission: { resource: "clockify", action: "manage" } }
        : undefined
    )
    const payload = await clockifyService.createClockifySession(context, body)

    if (payload.upstreamFailed) {
      response.status(502).json({
        error: payload.errorMessage || "Clockify report failed",
        session: payload.session,
      })
      return
    }

    response.json({ session: payload.session })
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/clockify/sessions")
  }
}

export async function updateClockifySessionController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "clockify", action: "manage" },
    })
    const payload = await clockifyService.updateClockifySessionReconciliation(
      context,
      parseUpdateClockifySessionBody(request.body)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/clockify/sessions")
  }
}

export async function deleteClockifySessionController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "clockify", action: "manage" },
    })
    const { sessionId } = parseDeleteClockifySessionQuery(request.query)
    const payload = await clockifyService.deleteClockifySession(context, sessionId)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in DELETE /api/clockify/sessions")
  }
}

export async function getClockifySettingsController(_request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "clockify", action: "view" },
    })
    const payload = await clockifyService.getClockifySettings(context)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/clockify/settings")
  }
}

export async function updateClockifySettingsController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "clockify", action: "manage" },
    })
    const payload = await clockifyService.updateClockifySettings(
      context,
      parseUpdateClockifySettingsBody(request.body)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/clockify/settings")
  }
}

export async function searchClockifyTicketsController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
    })
    const payload = await clockifyService.searchClockifyTickets(
      context,
      parseClockifyTicketSearchQuery(request.query)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/clockify/tickets")
  }
}

export async function reconcileClockifyTicketsController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
    })
    const { displayIds } = parseClockifyReconcileBody(request.body)
    const payload = await clockifyService.reconcileClockifyTickets(context, displayIds)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/clockify/reconcile")
  }
}
