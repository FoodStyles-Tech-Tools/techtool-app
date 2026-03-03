"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { useRealtimeSubscription } from "./use-realtime"
import { createQueryString, requestJson } from "@/lib/client/api"
import { prepareLinkPayload, sanitizeLinkArray } from "@/lib/links"
import type { Ticket } from "@/lib/types"

type UseTicketsOptions = {
  projectId?: string
  project_id?: string
  parentTicketId?: string
  parent_ticket_id?: string
  assigneeId?: string
  assignee_id?: string
  status?: string
  departmentId?: string
  department_id?: string
  requestedById?: string
  requested_by_id?: string
  excludeDone?: boolean
  exclude_done?: boolean
  excludeSubtasks?: boolean
  exclude_subtasks?: boolean
  limit?: number
  page?: number
  enabled?: boolean
  realtime?: boolean
}

type TicketsResponse = {
  items?: Ticket[]
  tickets?: Ticket[]
  data?: Ticket[]
  pageInfo?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  nextCursor?: string | null
}

type TicketResponse = {
  ticket: Ticket
}

function normalizeTicket(ticket: Ticket): Ticket {
  return {
    ...ticket,
    links: sanitizeLinkArray(ticket.links),
  }
}

export function useTickets(options?: UseTicketsOptions) {
  const queryClient = useQueryClient()
  const enabled = options?.enabled !== false
  const realtime = options?.realtime === true
  const projectId = options?.projectId ?? options?.project_id
  const parentTicketId = options?.parentTicketId ?? options?.parent_ticket_id
  const assigneeId = options?.assigneeId ?? options?.assignee_id
  const departmentId = options?.departmentId ?? options?.department_id
  const requestedById = options?.requestedById ?? options?.requested_by_id
  const excludeDone = options?.excludeDone ?? options?.exclude_done
  const excludeSubtasks = options?.excludeSubtasks ?? options?.exclude_subtasks ?? true
  const queryKey = [
    "tickets",
    projectId,
    parentTicketId,
    assigneeId,
    options?.status,
    departmentId,
    requestedById,
    excludeDone,
    excludeSubtasks,
    options?.limit,
    options?.page,
  ] as const

  const patchTicketInLists = useCallback(
    (ticketId: string, updater: (ticket: Ticket) => Ticket) => {
      queryClient.setQueriesData<TicketsResponse>({ queryKey: ["tickets"] }, (current) => {
        if (!current) return current
        const sourceItems = current?.items || current?.tickets || current?.data || []
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
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
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
        queryClient.setQueryData<{ ticket: Ticket }>(["ticket", updatedId], (current) => {
          if (!current?.ticket) return current
          return {
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
        queryClient.setQueriesData<TicketsResponse>({ queryKey: ["tickets"] }, (current) => {
          if (!current) return current
          const sourceItems = current?.items || current?.tickets || current?.data || []
          if (!sourceItems.length) return current
          const nextItems = sourceItems.filter((ticket) => ticket.id !== deletedId)
          if (nextItems.length === sourceItems.length) return current

          const pageInfoSource = current.pageInfo || current.pagination
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
        queryClient.removeQueries({ queryKey: ["ticket", deletedId] })
      }
    },
  })

  const query = useQuery<TicketsResponse>({
    queryKey,
    enabled,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const query = createQueryString({
        view: "list",
        projectId,
        parentTicketId,
        assigneeId,
        status: options?.status,
        departmentId,
        requestedById,
        excludeDone,
        excludeSubtasks,
        limit: options?.limit,
        page: options?.page,
      })

      const response = await requestJson<TicketsResponse>(`/api/v2/tickets${query}`)
      const items = (response.items || response.data || response.tickets || []).map(normalizeTicket)
      const pageInfo = response.pageInfo || response.pagination
      return {
        items,
        data: items,
        ...(pageInfo ? { pageInfo } : {}),
        ...(response.nextCursor !== undefined ? { nextCursor: response.nextCursor } : {}),
      }
    },
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
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
    onDelete: () => {
      queryClient.removeQueries({ queryKey: ["ticket", ticketId] })
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
  })

  return useQuery<{ ticket: Ticket }>({
    queryKey: ["ticket", ticketId],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const response = await requestJson<TicketResponse>(`/api/v2/tickets/${ticketId}?view=detail`)
      return { ticket: normalizeTicket(response.ticket) }
    },
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      projectId?: string | null
      project_id?: string | null
      title: string
      description?: string | null
      dueDate?: string
      due_date?: string
      createdAt?: string
      created_at?: string
      assigneeId?: string
      assignee_id?: string
      sqaAssigneeId?: string
      sqa_assignee_id?: string
      sqaAssignedAt?: string | null
      sqa_assigned_at?: string | null
      requestedById?: string
      requested_by_id?: string
      priority?: string
      type?: string
      status?: string
      departmentId?: string
      department_id?: string
      links?: string[]
      epicId?: string
      epic_id?: string
      sprintId?: string
      sprint_id?: string
      parentTicketId?: string | null
      parent_ticket_id?: string | null
    }) => {
      const projectId = data.projectId ?? data.project_id
      const dueDate = data.dueDate ?? data.due_date
      const createdAt = data.createdAt ?? data.created_at
      const assigneeId = data.assigneeId ?? data.assignee_id
      const sqaAssigneeId = data.sqaAssigneeId ?? data.sqa_assignee_id
      const sqaAssignedAt = data.sqaAssignedAt ?? data.sqa_assigned_at
      const requestedById = data.requestedById ?? data.requested_by_id
      const departmentId = data.departmentId ?? data.department_id
      const epicId = data.epicId ?? data.epic_id
      const sprintId = data.sprintId ?? data.sprint_id
      const parentTicketId = data.parentTicketId ?? data.parent_ticket_id
      const payload = {
        title: data.title,
        ...(projectId !== undefined ? { projectId } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(createdAt !== undefined ? { createdAt } : {}),
        ...(assigneeId !== undefined ? { assigneeId } : {}),
        ...(sqaAssigneeId !== undefined ? { sqaAssigneeId } : {}),
        ...(sqaAssignedAt !== undefined ? { sqaAssignedAt } : {}),
        ...(requestedById !== undefined ? { requestedById } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(epicId !== undefined ? { epicId } : {}),
        ...(sprintId !== undefined ? { sprintId } : {}),
        ...(parentTicketId !== undefined ? { parentTicketId } : {}),
        links: prepareLinkPayload(data.links),
      }

      const response = await requestJson<TicketResponse>(`/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      return { ticket: normalizeTicket(response.ticket) }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<{ ticket: Ticket }>(["ticket", data.ticket.id], data)
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
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
      due_date?: string | null
      status?: string
      priority?: string
      type?: string
      projectId?: string | null
      project_id?: string | null
      assigneeId?: string | null
      assignee_id?: string | null
      sqaAssigneeId?: string | null
      sqa_assignee_id?: string | null
      requestedById?: string
      requested_by_id?: string
      departmentId?: string | null
      department_id?: string | null
      epicId?: string | null
      epic_id?: string | null
      sprintId?: string | null
      sprint_id?: string | null
      parentTicketId?: string | null
      parent_ticket_id?: string | null
      assignedAt?: string | null
      assigned_at?: string | null
      sqaAssignedAt?: string | null
      sqa_assigned_at?: string | null
      startedAt?: string | null
      started_at?: string | null
      completedAt?: string | null
      completed_at?: string | null
      createdAt?: string | null
      created_at?: string | null
      links?: string[]
      reason?: unknown
    }) => {
      const dueDate = data.dueDate ?? data.due_date
      const projectId = data.projectId ?? data.project_id
      const assigneeId = data.assigneeId ?? data.assignee_id
      const sqaAssigneeId = data.sqaAssigneeId ?? data.sqa_assignee_id
      const requestedById = data.requestedById ?? data.requested_by_id
      const departmentId = data.departmentId ?? data.department_id
      const epicId = data.epicId ?? data.epic_id
      const sprintId = data.sprintId ?? data.sprint_id
      const parentTicketId = data.parentTicketId ?? data.parent_ticket_id
      const assignedAt = data.assignedAt ?? data.assigned_at
      const sqaAssignedAt = data.sqaAssignedAt ?? data.sqa_assigned_at
      const startedAt = data.startedAt ?? data.started_at
      const completedAt = data.completedAt ?? data.completed_at
      const createdAt = data.createdAt ?? data.created_at
      const payload = {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(projectId !== undefined ? { projectId } : {}),
        ...(assigneeId !== undefined ? { assigneeId } : {}),
        ...(sqaAssigneeId !== undefined ? { sqaAssigneeId } : {}),
        ...(requestedById !== undefined ? { requestedById } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(epicId !== undefined ? { epicId } : {}),
        ...(sprintId !== undefined ? { sprintId } : {}),
        ...(parentTicketId !== undefined ? { parentTicketId } : {}),
        ...(assignedAt !== undefined ? { assignedAt } : {}),
        ...(sqaAssignedAt !== undefined ? { sqaAssignedAt } : {}),
        ...(startedAt !== undefined ? { startedAt } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
        ...(createdAt !== undefined ? { createdAt } : {}),
        ...(data.reason !== undefined ? { reason: data.reason } : {}),
        ...(data.links !== undefined ? { links: prepareLinkPayload(data.links) } : {}),
      }

      const response = await requestJson<TicketResponse>(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      return { ticket: normalizeTicket(response.ticket) }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<{ ticket: Ticket }>(["ticket", data.ticket.id], data)
      queryClient.setQueriesData<TicketsResponse>({ queryKey: ["tickets"] }, (current) => {
        if (!current) return current
        const sourceItems = current?.items || current?.tickets || current?.data || []
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
      const response = await requestJson<TicketResponse>(`/api/tickets/${id}/status-with-reason`, {
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
      queryClient.setQueryData<{ ticket: Ticket }>(["ticket", data.ticket.id], data)
      queryClient.setQueriesData<TicketsResponse>({ queryKey: ["tickets"] }, (current) => {
        if (!current) return current
        const sourceItems = current?.items || current?.tickets || current?.data || []
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
      queryClient.invalidateQueries({ queryKey: ["ticket-detail", data.ticket.id] })
      if (data.ticket.project?.id) {
        queryClient.invalidateQueries({ queryKey: ["project", data.ticket.project.id] })
      }
    },
  })
}
