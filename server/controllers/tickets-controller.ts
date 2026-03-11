import type { Request, Response } from "express"
import { getRequestContext } from "@/lib/auth-helpers"
import { getOrSetServerCache } from "@/lib/server/cache"
import { getTicketCacheVersion } from "@/lib/server/ticket-cache"
import { handleControllerError } from "@server/http/handle-controller-error"
import * as ticketsService from "@server/services/tickets-service"
import {
  parseBatchUpdateTicketStatusBody,
  parseCreateTicketBody,
  parseTicketDetailRequest,
  parseTicketIdParams,
  parseTicketListRequest,
  parseUpdateTicketBody,
  parseUpdateTicketStatusWithReasonBody,
} from "@server/validation/tickets"

function toSearchParams(request: Request) {
  const searchParams = new URLSearchParams()

  Object.entries(request.query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined) {
          searchParams.append(key, String(entry))
        }
      })
      return
    }

    if (value !== undefined) {
      searchParams.set(key, String(value))
    }
  })

  return searchParams
}

export async function listTicketsController(request: Request, response: Response) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
      requireUserContext: false,
    })
    const listQuery = parseTicketListRequest(toSearchParams(request))
    const cacheVersion = await getTicketCacheVersion()
    const cacheKey = ticketsService.buildTicketListCacheKey(userId, listQuery, cacheVersion)

    const payload = await getOrSetServerCache(cacheKey, 30, () =>
      ticketsService.listTickets({ supabase, userId }, listQuery)
    )

    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/v2/tickets")
  }
}

export async function listLegacyTicketsController(request: Request, response: Response) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
      requireUserContext: false,
    })
    const listQuery = parseTicketListRequest(toSearchParams(request))
    const cacheVersion = await getTicketCacheVersion()
    const cacheKey = ticketsService.buildTicketListCacheKey(userId, listQuery, cacheVersion)

    const payload = await getOrSetServerCache(cacheKey, 30, () =>
      ticketsService.listTickets({ supabase, userId }, listQuery)
    )

    response.setHeader("X-Techtool-Deprecated", "Use /api/v2/tickets")
    response.json({
      tickets: payload.items,
      ...(payload.pageInfo ? { pagination: payload.pageInfo } : {}),
      ...(payload.nextCursor ? { nextCursor: payload.nextCursor } : {}),
    })
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/tickets")
  }
}

export async function getTicketDetailController(request: Request, response: Response) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
      requireUserContext: false,
    })
    const { id } = parseTicketIdParams(request.params)
    parseTicketDetailRequest(toSearchParams(request))
    const cacheVersion = await getTicketCacheVersion()
    const cacheKey = ticketsService.buildTicketDetailCacheKey(userId, id, cacheVersion)

    const payload = await getOrSetServerCache(cacheKey, 30, () =>
      ticketsService.getTicketDetail({ supabase, userId }, id)
    )

    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/v2/tickets/:id")
  }
}

export async function getLegacyTicketController(request: Request, response: Response) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
      requireUserContext: false,
    })
    const { id } = parseTicketIdParams(request.params)
    const cacheVersion = await getTicketCacheVersion()
    const cacheKey = ticketsService.buildTicketDetailCacheKey(userId, id, cacheVersion)

    const payload = await getOrSetServerCache(cacheKey, 30, () =>
      ticketsService.getTicketDetail({ supabase, userId }, id)
    )

    response.setHeader("X-Techtool-Deprecated", "Use /api/v2/tickets/:id?view=detail")
    response.json({ ticket: payload.ticket })
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/tickets/:id")
  }
}

export async function getLegacyTicketDetailController(request: Request, response: Response) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
      requireUserContext: false,
    })
    const { id } = parseTicketIdParams(request.params)
    const cacheVersion = await getTicketCacheVersion()
    const cacheKey = ticketsService.buildTicketDetailCacheKey(userId, id, cacheVersion)

    const payload = await getOrSetServerCache(cacheKey, 30, () =>
      ticketsService.getTicketDetail({ supabase, userId }, id)
    )

    response.setHeader("X-Techtool-Deprecated", "Use /api/v2/tickets/:id?view=detail")
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/tickets/:id/detail")
  }
}

export async function createTicketController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "tickets", action: "create" },
    })
    const payload = await ticketsService.createTicket(context, parseCreateTicketBody(request.body))
    response.status(201).json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/v2/tickets")
  }
}

export async function createLegacyTicketController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "tickets", action: "create" },
    })
    const payload = await ticketsService.createTicket(context, parseCreateTicketBody(request.body))
    response.setHeader("X-Techtool-Deprecated", "Use /api/v2/tickets")
    response.status(201).json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/tickets")
  }
}

export async function updateTicketController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })
    const { id } = parseTicketIdParams(request.params)
    const body = parseUpdateTicketBody(request.body)
    const payload = await ticketsService.updateTicket(
      context,
      id,
      body,
      request.body as Record<string, unknown>
    )

    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/v2/tickets/:id")
  }
}

export async function updateLegacyTicketController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })
    const { id } = parseTicketIdParams(request.params)
    const body = parseUpdateTicketBody(request.body)
    const payload = await ticketsService.updateTicket(
      context,
      id,
      body,
      request.body as Record<string, unknown>
    )

    response.setHeader("X-Techtool-Deprecated", "Use /api/v2/tickets/:id")
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in PATCH /api/tickets/:id")
  }
}

export async function updateTicketStatusWithReasonController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })
    const { id } = parseTicketIdParams(request.params)
    const payload = await ticketsService.updateTicketStatusWithReason(
      context,
      id,
      parseUpdateTicketStatusWithReasonBody(request.body)
    )

    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/v2/tickets/:id/status-with-reason")
  }
}

export async function updateLegacyTicketStatusWithReasonController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })
    const { id } = parseTicketIdParams(request.params)
    const payload = await ticketsService.updateTicketStatusWithReason(
      context,
      id,
      parseUpdateTicketStatusWithReasonBody(request.body)
    )

    response.setHeader("X-Techtool-Deprecated", "Use /api/v2/tickets/:id/status-with-reason")
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/tickets/:id/status-with-reason")
  }
}

export async function batchUpdateTicketStatusController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })
    const payload = await ticketsService.batchUpdateTicketStatus(
      context,
      parseBatchUpdateTicketStatusBody(request.body)
    )

    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/v2/tickets/batch-status")
  }
}

export async function batchUpdateLegacyTicketStatusController(request: Request, response: Response) {
  try {
    const context = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })
    const payload = await ticketsService.batchUpdateTicketStatus(
      context,
      parseBatchUpdateTicketStatusBody(request.body)
    )

    response.setHeader("X-Techtool-Deprecated", "Use /api/v2/tickets/batch-status")
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in POST /api/tickets/batch-status")
  }
}
