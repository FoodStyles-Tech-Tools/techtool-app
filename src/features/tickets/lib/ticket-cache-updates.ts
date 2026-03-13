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
  // Cancel in-flight detail reads so an older response can't overwrite this fresh mutation payload.
  // We intentionally do NOT cancel list queries here – doing so would abort refetches that are
  // triggered immediately after bulk operations (e.g. bulk deploy-round add/remove) which need
  // to pull a fresh filtered list from the server.
  if ("cancelQueries" in queryClient && typeof queryClient.cancelQueries === "function") {
    void queryClient.cancelQueries({ queryKey: ticketQueryKeys.detail(data.ticket.id) })
  }
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
  // Mark all detail queries stale but do NOT trigger an immediate background refetch.
  // The setQueryData calls above already put fresh data into the cache; an immediate
  // refetch can race with (and overwrite) that correct data if the server-side cache
  // hasn't fully propagated yet.  Stale queries will be re-fetched on the next window
  // focus, component mount, or when the Supabase realtime subscription fires.
  queryClient.invalidateQueries({ queryKey: ticketQueryKeys.detailRoot(), refetchType: "none" })
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
  queryClient.invalidateQueries({
    queryKey: ticketQueryKeys.detail(data.ticket.id),
    refetchType: "none",
  })
  queryClient.invalidateQueries({
    queryKey: ticketQueryKeys.lists(),
    refetchType: "none",
  })
}
