"use client"

import { useCallback, useState } from "react"
import { toast } from "@client/components/ui/toast"
import type { Ticket } from "@shared/types"
import { isSqaOnlyStatus, normalizeStatusKey } from "@shared/ticket-statuses"
import { FIELD_LABELS, type TicketMutationField } from "@shared/ticket-constants"
import {
  closeTicketSubtasksToStatus,
  resolveTicketDoneStatusGuard,
} from "@client/features/tickets/api/client"
import { buildAssignmentPayload, DONE_STATUS_KEYS } from "@client/features/tickets/lib/update-payloads"
import type { TicketStatusGuardResult, TicketSubtaskDecision, TicketSubtaskRow } from "@client/features/tickets/types"

type PendingStatusChange = {
  ticketId: string
  newStatus: string
}

type MutationClient = {
  mutateAsync: (input: any) => Promise<unknown>
}

type UseTicketBoardActionsParams = {
  allTickets: Ticket[]
  projectFilter: string
  askHowToHandleOpenSubtasks: (
    targetStatus: string,
    subtasks: TicketSubtaskRow[]
  ) => Promise<TicketSubtaskDecision>
  updateTicket: MutationClient
}

export function useTicketBoardActions({
  allTickets,
  projectFilter,
  askHowToHandleOpenSubtasks,
  updateTicket,
}: UseTicketBoardActionsParams) {
  const [updatingFields, setUpdatingFields] = useState<Record<string, string>>({})
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isTicketDialogOpen, setTicketDialogOpen] = useState(false)
  const [isEpicDialogOpen, setIsEpicDialogOpen] = useState(false)
  const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false)

  const resolveDoneStatusGuard = useCallback(
    (ticketId: string, targetStatus: string) =>
      resolveTicketDoneStatusGuard({
        ticketId,
        targetStatus,
        askDecision: askHowToHandleOpenSubtasks,
      }),
    [askHowToHandleOpenSubtasks]
  )

  const handleOpenCreateEpic = useCallback(() => {
    setIsEpicDialogOpen(true)
  }, [])

  const handleOpenCreateSprint = useCallback(() => {
    setIsSprintDialogOpen(true)
  }, [])

  const handleKanbanDrop = useCallback(
    async (ticketId: string, columnId: string): Promise<boolean> => {
      const ticket = allTickets.find((candidate) => candidate.id === ticketId)
      if (!ticket || ticket.status === columnId) return false

      const targetStatusKey = normalizeStatusKey(columnId)
      if (isSqaOnlyStatus(targetStatusKey)) {
        const requiresSqa = ticket.project?.require_sqa === true
        if (!requiresSqa) {
          toast("This project does not require SQA, so this status cannot be used.", "error")
          return false
        }
      }

      try {
        const doneGuard = await resolveDoneStatusGuard(ticketId, columnId)
        if (!doneGuard.proceed) return false

        // Send only the new status; the server derives timestamps from the transition.
        await updateTicket.mutateAsync({ id: ticketId, status: columnId })

        if (doneGuard.closeSubtasks) {
          await closeTicketSubtasksToStatus(doneGuard.subtasks, columnId)
          toast(`Ticket status updated. Closed ${doneGuard.subtasks.length} open subtask${doneGuard.subtasks.length === 1 ? "" : "s"}.`)
        } else {
          toast("Ticket status updated")
        }
        return true
      } catch (error: any) {
        toast(error.message || "Failed to update ticket", "error")
        return false
      }
    },
    [allTickets, resolveDoneStatusGuard, updateTicket]
  )

  const handleCopyTicketLabel = useCallback((ticket: Ticket) => {
    const projectName = ticket.project?.name || "No Project"
    const label = `[${projectName}] ${ticket.displayId || ticket.id.slice(0, 8)}_${ticket.title}`
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(label)
        .then(() => toast("Copied ticket info"))
        .catch(() => toast("Failed to copy ticket info", "error"))
    } else {
      toast("Clipboard not available", "error")
    }
  }, [])

  const updateTicketField = useCallback(
    async (ticketId: string, field: TicketMutationField, value: string | null | undefined) => {
      const currentTicket = allTickets.find((ticket) => ticket.id === ticketId)

      let doneGuard: TicketStatusGuardResult | null = null
      const body: any = {}

      if (field === "requestedById") {
        if (!value) {
          toast("Requested by cannot be empty", "error")
          return
        }
        body[field] = value
      } else if (field === "assigneeId") {
        Object.assign(body, buildAssignmentPayload("assigneeId", value))
      } else if (field === "sqaAssigneeId") {
        Object.assign(body, buildAssignmentPayload("sqaAssigneeId", value))
      } else if (field === "status") {
        const previousStatus = currentTicket?.status ?? "open"
        const newStatus = value as string

        // Send only the new status; the server derives timestamps from the transition.
        body.status = newStatus

        if (DONE_STATUS_KEYS.has(newStatus) && previousStatus !== newStatus) {
          doneGuard = await resolveDoneStatusGuard(ticketId, newStatus)
          if (!doneGuard.proceed) return
        }
      } else if (field === "departmentId") {
        body[field] = value || null
      } else {
        body[field] = value
      }

      const cellKey = `${ticketId}-${field}`
      setUpdatingFields((previous) => ({ ...previous, [cellKey]: field }))

      try {
        await updateTicket.mutateAsync({ id: ticketId, ...body })
        toast(`${FIELD_LABELS[field] || "Ticket"} updated`)
        if (field === "status" && doneGuard?.closeSubtasks) {
          await closeTicketSubtasksToStatus(doneGuard.subtasks, String(value))
          toast(`Closed ${doneGuard.subtasks.length} open subtask${doneGuard.subtasks.length === 1 ? "" : "s"}.`)
        }
      } catch (error: any) {
        toast(error.message || "Failed to update ticket", "error")
      } finally {
        setUpdatingFields((previous) => {
          const next = { ...previous }
          delete next[cellKey]
          return next
        })
      }
    },
    [allTickets, resolveDoneStatusGuard, updateTicket]
  )

  return {
    updatingFields,
    selectedTicketId,
    setSelectedTicketId,
    isTicketDialogOpen,
    setTicketDialogOpen,
    isEpicDialogOpen,
    setIsEpicDialogOpen,
    isSprintDialogOpen,
    setIsSprintDialogOpen,
    handleOpenCreateEpic,
    handleOpenCreateSprint,
    handleKanbanDrop,
    handleCopyTicketLabel,
    updateTicketField,
  }
}
