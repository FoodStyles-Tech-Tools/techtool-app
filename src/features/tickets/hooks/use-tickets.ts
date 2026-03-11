"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { useRealtimeSubscription } from "@client/hooks/use-realtime"
import { requestJson } from "@client/lib/api"
import { prepareLinkPayload } from "@shared/links"
import {
  fetchTicketDetail,
  fetchTicketList,
  normalizeTicket,
  type TicketDetailResponse,
  type TicketResponse,
  type TicketsResponse,
} from "@client/features/tickets/lib/client"
import { ticketQueryKeys } from "@client/features/tickets/lib/query-keys"
import type { Ticket } from "@shared/types"
import type { SortColumn } from "@shared/ticket-constants"

type UseTicketsOptions = {
  projectId?: string
  parentTicketId?: string
  assigneeId?: string
  status?: string
  departmentId?: string
  requestedById?: string
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
  const departmentId = options?.departmentId
  const requestedById = options?.requestedById
  const sprintId = options?.sprintId
  const excludeDone = options?.excludeDone
  const excludeSubtasks = options?.excludeSubtasks ?? true
  const queryKey = ticketQueryKeys.list({
    projectId,
    parentTicketId,
    assigneeId,
    status: options?.status,
    departmentId,
    requestedById,
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
        status: options?.status,
        departmentId,
        requestedById,
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

export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      projectId?: string | null
      title: string
      description?: string | null
      dueDate?: string
      createdAt?: string
      assigneeId?: string
      sqaAssigneeId?: string
      sqaAssignedAt?: string | null
      requestedById?: string
      priority?: string
      type?: string
      status?: string
      departmentId?: string
      links?: string[]
      epicId?: string
      sprintId?: string
      parentTicketId?: string | null
    }) => {
      const payload = {
        title: data.title,
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
        ...(data.createdAt !== undefined ? { createdAt: data.createdAt } : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
        ...(data.sqaAssigneeId !== undefined ? { sqaAssigneeId: data.sqaAssigneeId } : {}),
        ...(data.sqaAssignedAt !== undefined ? { sqaAssignedAt: data.sqaAssignedAt } : {}),
        ...(data.requestedById !== undefined ? { requestedById: data.requestedById } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId } : {}),
        ...(data.epicId !== undefined ? { epicId: data.epicId } : {}),
        ...(data.sprintId !== undefined ? { sprintId: data.sprintId } : {}),
        ...(data.parentTicketId !== undefined ? { parentTicketId: data.parentTicketId } : {}),
        links: prepareLinkPayload(data.links),
      }

      const response = await requestJson<TicketResponse>(`/api/v2/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      return { ticket: normalizeTicket(response.ticket) }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<{ ticket: Ticket }>(ticketQueryKeys.entity(data.ticket.id), data)
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.detailRoot() })
      if (data.ticket.project?.id) {
        queryClient.invalidateQueries({ queryKey: ["project", data.ticket.project.id] })
      }
    },
  })
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      title?: string
      description?: string | null
      dueDate?: string | null
      status?: string
      priority?: string
      type?: string
      projectId?: string | null
      assigneeId?: string | null
      sqaAssigneeId?: string | null
      requestedById?: string
      departmentId?: string | null
      epicId?: string | null
      sprintId?: string | null
      parentTicketId?: string | null
      assignedAt?: string | null
      sqaAssignedAt?: string | null
      startedAt?: string | null
      completedAt?: string | null
      createdAt?: string | null
      links?: string[]
      reason?: unknown
    }) => {
      const payload = {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.projectId !== undefined ? { projectId: data.projectId } : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
        ...(data.sqaAssigneeId !== undefined ? { sqaAssigneeId: data.sqaAssigneeId } : {}),
        ...(data.requestedById !== undefined ? { requestedById: data.requestedById } : {}),
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId } : {}),
        ...(data.epicId !== undefined ? { epicId: data.epicId } : {}),
        ...(data.sprintId !== undefined ? { sprintId: data.sprintId } : {}),
        ...(data.parentTicketId !== undefined ? { parentTicketId: data.parentTicketId } : {}),
        ...(data.assignedAt !== undefined ? { assignedAt: data.assignedAt } : {}),
        ...(data.sqaAssignedAt !== undefined ? { sqaAssignedAt: data.sqaAssignedAt } : {}),
        ...(data.startedAt !== undefined ? { startedAt: data.startedAt } : {}),
        ...(data.completedAt !== undefined ? { completedAt: data.completedAt } : {}),
        ...(data.createdAt !== undefined ? { createdAt: data.createdAt } : {}),
        ...(data.reason !== undefined ? { reason: data.reason } : {}),
        ...(data.links !== undefined ? { links: prepareLinkPayload(data.links) } : {}),
      }

      const response = await requestJson<TicketResponse>(`/api/v2/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      return { ticket: normalizeTicket(response.ticket) }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<{ ticket: Ticket }>(ticketQueryKeys.entity(data.ticket.id), data)
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
    },
  })
}

export function useUpdateTicketWithReasonComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
      reasonCommentBody,
      startedAt,
      completedAt,
      epicId,
    }: {
      id: string
      status: "cancelled" | "rejected" | "returned_to_dev"
      reason?: unknown
      reasonCommentBody: string
      startedAt?: string | null
      completedAt?: string | null
      epicId?: string | null
    }) => {
      const response = await requestJson<TicketResponse>(`/api/v2/tickets/${id}/status-with-reason`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(reason !== undefined ? { reason } : {}),
          reasonCommentBody,
          ...(startedAt !== undefined ? { startedAt } : {}),
          ...(completedAt !== undefined ? { completedAt } : {}),
          ...(epicId !== undefined ? { epicId } : {}),
        }),
      })

      return { ticket: normalizeTicket(response.ticket) }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<{ ticket: Ticket }>(ticketQueryKeys.entity(data.ticket.id), data)
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
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.detail(data.ticket.id) })
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.lists() })
      if (data.ticket.project?.id) {
        queryClient.invalidateQueries({ queryKey: ["project", data.ticket.project.id] })
      }
    },
  })
}
