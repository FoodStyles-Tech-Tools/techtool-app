"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { requestJson } from "@client/lib/api"
import { prepareLinkPayload } from "@shared/links"
import { normalizeTicket, type TicketResponse } from "@client/features/tickets/lib/client"
import { pickDefined } from "@client/features/tickets/lib/request-payloads"
import {
  applyTicketCreateSuccess,
  applyTicketEntitySuccess,
  applyTicketStatusWithReasonSuccess,
} from "@client/features/tickets/lib/ticket-cache-updates"

export type CreateTicketInput = {
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
  deployRoundId?: string | null
}

export type UpdateTicketInput = {
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
  deployRoundId?: string | null
}

export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTicketInput) => {
      const payload = {
        title: data.title,
        ...pickDefined({
          projectId: data.projectId,
          description: data.description,
          dueDate: data.dueDate,
          createdAt: data.createdAt,
          assigneeId: data.assigneeId,
          sqaAssigneeId: data.sqaAssigneeId,
          sqaAssignedAt: data.sqaAssignedAt,
          requestedById: data.requestedById,
          priority: data.priority,
          type: data.type,
          status: data.status,
          departmentId: data.departmentId,
          epicId: data.epicId,
          sprintId: data.sprintId,
          parentTicketId: data.parentTicketId,
          deployRoundId: data.deployRoundId,
        }),
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
      applyTicketCreateSuccess(queryClient, data)
    },
  })
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTicketInput) => {
      const payload: Record<string, unknown> = {
        ...pickDefined({
          title: data.title,
          description: data.description,
          dueDate: data.dueDate,
          status: data.status,
          priority: data.priority,
          type: data.type,
          projectId: data.projectId,
          assigneeId: data.assigneeId,
          sqaAssigneeId: data.sqaAssigneeId,
          requestedById: data.requestedById,
          departmentId: data.departmentId,
          epicId: data.epicId,
          sprintId: data.sprintId,
          parentTicketId: data.parentTicketId,
          assignedAt: data.assignedAt,
          sqaAssignedAt: data.sqaAssignedAt,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          createdAt: data.createdAt,
          reason: data.reason,
          deployRoundId: data.deployRoundId,
        }),
      }
      if (data.links !== undefined) {
        payload.links = prepareLinkPayload(data.links)
      }

      const response = await requestJson<TicketResponse>(`/api/v2/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      return { ticket: normalizeTicket(response.ticket) }
    },
    onSuccess: (data) => {
      applyTicketEntitySuccess(queryClient, data)
    },
  })
}

export type UpdateTicketStatusWithReasonInput = {
  id: string
  status: "cancelled" | "rejected" | "returned_to_dev"
  reason?: unknown
  reasonCommentBody: string
  startedAt?: string | null
  completedAt?: string | null
  epicId?: string | null
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
    }: UpdateTicketStatusWithReasonInput) => {
      const body = {
        status,
        reasonCommentBody,
        ...pickDefined({ reason, startedAt, completedAt, epicId }),
      }

      const response = await requestJson<TicketResponse>(`/api/v2/tickets/${id}/status-with-reason`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      return { ticket: normalizeTicket(response.ticket) }
    },
    onSuccess: (data) => {
      applyTicketStatusWithReasonSuccess(queryClient, data)
    },
  })
}
