"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { useRealtimeSubscription } from "@client/hooks/use-realtime"
import {
  fetchTicketDetail,
  fetchTicketList,
  normalizeTicket,
  type TicketDetailResponse,
  type TicketsResponse,
} from "@client/features/tickets/lib/client"
import { ticketQueryKeys } from "@client/features/tickets/lib/query-keys"
import type { Ticket } from "@shared/types"
import type { SortColumn } from "@shared/ticket-constants"

export { useCreateTicket, useUpdateTicket, useUpdateTicketWithReasonComment } from "./use-ticket-mutations"

type UseTicketsOptions = {
  projectId?: string
  parentTicketId?: string
  assigneeId?: string
  sqaAssigneeId?: string
  status?: string
  /** Exclude tickets with these status keys (e.g. ["cancelled", "completed"]). */
  excludeStatuses?: string[]
  priority?: string
  departmentId?: string
  requestedById?: string
  epicId?: string
  sprintId?: string
  excludeDone?: boolean
  excludeSubtasks?: boolean
  q?: string
  limit?: number
  page?: number
  sortBy?: SortColumn
  sortDirection?: "asc" | "desc"
  enabled?: boolean
  realtime?: boolean
}

export function useTickets(options?: UseTicketsOptions) {
  const queryClient = useQueryClient()
  const enabled = options?.enabled !== false
  const realtime = options?.realtime === true
  const projectId = options?.projectId
  const parentTicketId = options?.parentTicketId
  const assigneeId = options?.assigneeId
  const sqaAssigneeId = options?.sqaAssigneeId
  const departmentId = options?.departmentId
  const requestedById = options?.requestedById
  const epicId = options?.epicId
  const sprintId = options?.sprintId
  const excludeDone = options?.excludeDone
  const excludeStatuses = options?.excludeStatuses
  const excludeSubtasks = options?.excludeSubtasks ?? true
  const queryKey = ticketQueryKeys.list({
    projectId,
    parentTicketId,
    assigneeId,
    sqaAssigneeId,
    status: options?.status,
    excludeStatuses: excludeStatuses?.length ? excludeStatuses.join(",") : undefined,
    priority: options?.priority,
    departmentId,
    requestedById,
    epicId,
    sprintId,
    excludeDone,
    excludeSubtasks,
    q: options?.q,
    limit: options?.limit,
    page: options?.page,
    sortBy: options?.sortBy,
    sortDirection: options?.sortDirection,
  })

  const patchTicketInLists = useCallback(
    (ticketId: string, updater: (ticket: Ticket) => Ticket) => {
      queryClient.setQueriesData<TicketsResponse>({ queryKey: ticketQueryKeys.lists() }, (current) => {
        if (!current) return current
        const sourceItems = current.items || current.data || []
        if (!sourceItems.length) return current

        let changed = false
        const nextItems = sourceItems.map((ticket) => {
          if (ticket.id !== ticketId) return ticket
          changed = true
          return updater(ticket)
        })

        if (!changed) return current
        return { ...current, items: nextItems, data: nextItems }
      })
    },
    [queryClient]
  )

  useRealtimeSubscription({
    table: "tickets",
    enabled: enabled && realtime,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.lists() })
    },
    onUpdate: (payload) => {
      const updatedId = (payload.new as { id?: string } | null)?.id
      if (updatedId) {
        const partial = payload.new as Partial<Ticket>
        patchTicketInLists(updatedId, (current) =>
          normalizeTicket({
            ...current,
            ...partial,
          } as Ticket)
        )
        queryClient.setQueryData<{ ticket: Ticket }>(ticketQueryKeys.entity(updatedId), (current) => {
          if (!current?.ticket) return current
          return {
            ticket: normalizeTicket({
              ...current.ticket,
              ...partial,
            } as Ticket),
          }
        })
        queryClient.setQueryData<TicketDetailResponse>(ticketQueryKeys.detail(updatedId), (current) => {
          if (!current?.ticket) return current
          return {
            ...current,
            ticket: normalizeTicket({
              ...current.ticket,
              ...partial,
            } as Ticket),
          }
        })
      }
    },
    onDelete: (payload) => {
      const deletedId = (payload.old as { id?: string } | null)?.id
      if (deletedId) {
        queryClient.setQueriesData<TicketsResponse>({ queryKey: ticketQueryKeys.lists() }, (current) => {
          if (!current) return current
          const sourceItems = current.items || current.data || []
          if (!sourceItems.length) return current
          const nextItems = sourceItems.filter((ticket) => ticket.id !== deletedId)
          if (nextItems.length === sourceItems.length) return current

          const pageInfoSource = current.pageInfo
          const pageInfo = pageInfoSource
            ? {
                ...pageInfoSource,
                total: Math.max(0, pageInfoSource.total - 1),
                totalPages:
                  pageInfoSource.limit > 0
                    ? Math.max(
                        1,
                        Math.ceil(Math.max(0, pageInfoSource.total - 1) / pageInfoSource.limit)
                      )
                    : pageInfoSource.totalPages,
              }
            : undefined

          return {
            ...current,
            items: nextItems,
            data: nextItems,
            ...(pageInfo ? { pageInfo } : {}),
          }
        })
        queryClient.removeQueries({ queryKey: ticketQueryKeys.entity(deletedId) })
        queryClient.removeQueries({ queryKey: ticketQueryKeys.detail(deletedId) })
      }
    },
  })

  const query = useQuery<TicketsResponse>({
    queryKey,
    enabled,
    staleTime: 30 * 1000,
    queryFn: () =>
      fetchTicketList({
        projectId,
        parentTicketId,
        assigneeId,
        sqaAssigneeId,
        status: options?.status,
        excludeStatuses: options?.excludeStatuses,
        priority: options?.priority,
        departmentId,
        requestedById,
        epicId,
        sprintId,
        excludeDone,
        excludeSubtasks,
        q: options?.q,
        limit: options?.limit,
        page: options?.page,
        sortBy: options?.sortBy,
        sortDirection: options?.sortDirection,
      }),
  })

  return {
    ...query,
    data: query.data?.items || [],
    pagination: query.data?.pageInfo,
    nextCursor: query.data?.nextCursor ?? null,
  }
}

export function useTicket(ticketId: string, options?: { enabled?: boolean; realtime?: boolean }) {
  const queryClient = useQueryClient()
  const enabled = !!ticketId && options?.enabled !== false
  const realtime = options?.realtime !== false

  useRealtimeSubscription({
    table: "tickets",
    filter: `id=eq.${ticketId}`,
    enabled: enabled && realtime,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.entity(ticketId) })
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.detail(ticketId) })
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.lists() })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.entity(ticketId) })
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.detail(ticketId) })
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.lists() })
    },
    onDelete: () => {
      queryClient.removeQueries({ queryKey: ticketQueryKeys.entity(ticketId) })
      queryClient.removeQueries({ queryKey: ticketQueryKeys.detail(ticketId) })
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.lists() })
    },
  })

  return useQuery<{ ticket: Ticket }>({
    queryKey: ticketQueryKeys.entity(ticketId),
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const response = await fetchTicketDetail(ticketId)
      return { ticket: response.ticket }
    },
  })
}
