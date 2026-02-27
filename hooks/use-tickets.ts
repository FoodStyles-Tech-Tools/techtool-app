"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { createQueryString, requestJson } from "@/lib/client/api"
import { prepareLinkPayload, sanitizeLinkArray } from "@/lib/links"
import type { Ticket } from "@/lib/types"

type UseTicketsOptions = {
  project_id?: string
  parent_ticket_id?: string
  assignee_id?: string
  status?: string
  department_id?: string
  requested_by_id?: string
  exclude_done?: boolean
  exclude_subtasks?: boolean
  limit?: number
  page?: number
  enabled?: boolean
  realtime?: boolean
}

type TicketsResponse = {
  tickets: Ticket[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
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
  const excludeSubtasks = options?.exclude_subtasks ?? true
  const queryKey = [
    "tickets",
    options?.project_id,
    options?.parent_ticket_id,
    options?.assignee_id,
    options?.status,
    options?.department_id,
    options?.requested_by_id,
    options?.exclude_done,
    excludeSubtasks,
    options?.limit,
    options?.page,
  ] as const

  useRealtimeSubscription({
    table: "tickets",
    enabled: enabled && realtime,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
    onUpdate: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      const updatedId = (payload.new as { id?: string } | null)?.id
      if (updatedId) {
        queryClient.invalidateQueries({ queryKey: ["ticket", updatedId] })
      }
    },
    onDelete: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      const deletedId = (payload.old as { id?: string } | null)?.id
      if (deletedId) {
        queryClient.removeQueries({ queryKey: ["ticket", deletedId] })
      }
    },
  })

  return useQuery<Ticket[]>({
    queryKey,
    enabled,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const query = createQueryString({
        project_id: options?.project_id,
        parent_ticket_id: options?.parent_ticket_id,
        assignee_id: options?.assignee_id,
        status: options?.status,
        department_id: options?.department_id,
        requested_by_id: options?.requested_by_id,
        exclude_done: options?.exclude_done,
        exclude_subtasks: excludeSubtasks,
        limit: options?.limit,
        page: options?.page,
      })

      const response = await requestJson<TicketsResponse>(`/api/tickets${query}`)
      return (response.tickets || []).map(normalizeTicket)
    },
  })
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
      const response = await requestJson<TicketResponse>(`/api/tickets/${ticketId}`)
      return { ticket: normalizeTicket(response.ticket) }
    },
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      project_id?: string | null
      title: string
      description?: string | null
      due_date?: string
      created_at?: string
      assignee_id?: string
      sqa_assignee_id?: string
      sqa_assigned_at?: string | null
      requested_by_id?: string
      priority?: string
      type?: string
      status?: string
      department_id?: string
      links?: string[]
      epic_id?: string
      sprint_id?: string
      parent_ticket_id?: string | null
    }) => {
      const payload = {
        ...data,
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
      due_date?: string | null
      status?: string
      priority?: string
      type?: string
      project_id?: string | null
      assignee_id?: string | null
      sqa_assignee_id?: string | null
      requested_by_id?: string
      department_id?: string | null
      epic_id?: string | null
      sprint_id?: string | null
      parent_ticket_id?: string | null
      assigned_at?: string | null
      sqa_assigned_at?: string | null
      started_at?: string | null
      completed_at?: string | null
      created_at?: string | null
      returned_to_dev_reason?: string | null
      links?: string[]
      reason?: unknown
    }) => {
      const payload = {
        ...data,
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
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      if (data.ticket.project?.id) {
        queryClient.invalidateQueries({ queryKey: ["project", data.ticket.project.id] })
      }
    },
  })
}
