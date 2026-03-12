"use client"

import type { QueryClient } from "@tanstack/react-query"
import { ticketQueryKeys } from "@client/features/tickets/lib/query-keys"
import type { TicketDetailResponse, TicketsResponse } from "@client/features/tickets/lib/client"
import type { Ticket } from "@shared/types"

/**
 * After a ticket create: set entity cache, invalidate lists and related.
 */
export function applyTicketCreateSuccess(
  queryClient: QueryClient,
  data: { ticket: Ticket }
): void {
  queryClient.setQueryData(ticketQueryKeys.entity(data.ticket.id), data)
  queryClient.invalidateQueries({ queryKey: ticketQueryKeys.lists() })
  queryClient.invalidateQueries({ queryKey: ticketQueryKeys.detailRoot() })
  if (data.ticket.project?.id) {
    queryClient.invalidateQueries({ queryKey: ["project", data.ticket.project.id] })
  }
}

/**
 * After a ticket update or status-with-reason: set entity + detail, update ticket in list caches, invalidate related.
 */
export function applyTicketEntitySuccess(
  queryClient: QueryClient,
  data: { ticket: Ticket }
): void {
  queryClient.setQueryData(ticketQueryKeys.entity(data.ticket.id), data)
  queryClient.setQueryData<TicketDetailResponse>(ticketQueryKeys.detail(data.ticket.id), (current) =>
    current ? { ...current, ticket: data.ticket } : current
  )
  queryClient.setQueriesData<TicketsResponse>({ queryKey: ticketQueryKeys.lists() }, (current) => {
    if (!current) return current
    const sourceItems = current.items || current.data || []
    if (!sourceItems.length) return current
    let changed = false
    const nextItems = sourceItems.map((ticket) => {
      if (ticket.id !== data.ticket.id) return ticket
      changed = true
      return data.ticket
    })
    if (!changed) return current
    return {
      ...current,
      items: nextItems,
      data: nextItems,
    }
  })
  queryClient.invalidateQueries({ queryKey: ticketQueryKeys.detailRoot() })
  if (data.ticket.project?.id) {
    queryClient.invalidateQueries({ queryKey: ["project", data.ticket.project.id] })
  }
}

/**
 * After status-with-reason: also invalidate this ticket's detail and lists (for comment/activity).
 */
export function applyTicketStatusWithReasonSuccess(
  queryClient: QueryClient,
  data: { ticket: Ticket }
): void {
  applyTicketEntitySuccess(queryClient, data)
  queryClient.invalidateQueries({ queryKey: ticketQueryKeys.detail(data.ticket.id) })
  queryClient.invalidateQueries({ queryKey: ticketQueryKeys.lists() })
}
