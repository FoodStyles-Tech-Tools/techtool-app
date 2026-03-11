import type { Request, Response } from "express"
import { getRequestContext } from "@/lib/auth-helpers"
import { handleControllerError } from "@/server/http/handle-controller-error"
import * as reportSessionsService from "@/server/services/report-sessions-service"
import {
  parseCreateReportSessionBody,
  parseReportSessionIdParams,
  parseUpdateReportSessionBody,
} from "@/server/validation/report-sessions"

export async function listReportSessionsController(_request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "clockify", action: "view" },
    })
    const payload = await reportSessionsService.listReportSessions(context)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "GET /api/report/sessions")
  }
}

export async function createReportSessionController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "clockify", action: "view" },
    })
    const payload = await reportSessionsService.createReportSession(
      context,
      parseCreateReportSessionBody(request.body)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "POST /api/report/sessions")
  }
}

export async function getReportSessionController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "clockify", action: "view" },
    })
    const { id } = parseReportSessionIdParams(request.params)
    const payload = await reportSessionsService.getReportSession(context, id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "GET /api/report/sessions/:id")
  }
}

export async function updateReportSessionController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "clockify", action: "view" },
    })
    const { id } = parseReportSessionIdParams(request.params)
    const payload = await reportSessionsService.updateReportSession(
      context,
      id,
      parseUpdateReportSessionBody(request.body)
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "PATCH /api/report/sessions/:id")
  }
}

export async function deleteReportSessionController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "clockify", action: "view" },
    })
    const { id } = parseReportSessionIdParams(request.params)
    await reportSessionsService.deleteReportSession(context, id)
    response.status(204).send()
  } catch (error) {
    handleControllerError(response, error, "DELETE /api/report/sessions/:id")
  }
}

export async function getReportSessionDataController(request: Request, response: Response) {
  try {
    await getRequestContext({
      permission: { resource: "clockify", action: "view" },
    })
    const { id } = parseReportSessionIdParams(request.params)
    const payload = await reportSessionsService.getReportSessionData(id)
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "GET /api/report/sessions/:id/data")
  }
}
