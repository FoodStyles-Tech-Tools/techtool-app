"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import { toast } from "@client/components/ui/toast"
import type { Ticket } from "@shared/types"
import {
  closeTicketSubtasksToStatus,
  resolveTicketDoneStatusGuard,
} from "@client/features/tickets/api/client"
import type {
  TicketStatusGuardResult,
  TicketSubtaskDecision,
  TicketSubtaskRow,
} from "@client/features/tickets/types"

type MutationClient = {
  mutateAsync: (input: any) => Promise<unknown>
}

type UseTicketDetailStatusActionsParams = {
  ticketId: string | null
  ticket: Ticket | null | undefined
  ensureCanEdit: (options?: { allowWhenUnassigned?: boolean; allowSqaSelfAssign?: boolean }) => boolean
  askHowToHandleOpenSubtasks: (
    targetStatus: string,
    subtasks: TicketSubtaskRow[]
  ) => Promise<TicketSubtaskDecision>
  updateTicket: MutationClient
  updateTicketWithToast: (
    updates: Record<string, any>,
    successMessage: string,
    fieldName?: string
  ) => Promise<void>
  setUpdatingFields: Dispatch<SetStateAction<Record<string, boolean>>>
}

export function useTicketDetailStatusActions({
  ticketId,
  ticket,
  ensureCanEdit,
  askHowToHandleOpenSubtasks,
  updateTicket,
  updateTicketWithToast,
  setUpdatingFields,
}: UseTicketDetailStatusActionsParams) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const resolveSubtaskStatusGuard = async (
    targetStatus: string
  ): Promise<TicketStatusGuardResult> =>
    ticketId
      ? resolveTicketDoneStatusGuard({
          ticketId,
          targetStatus,
          askDecision: askHowToHandleOpenSubtasks,
        })
      : Promise.resolve({ proceed: true, closeSubtasks: false, subtasks: [] })

  const performStatusChange = async (
    newStatus: string,
    subtaskDecisionOverride?: TicketStatusGuardResult
  ) => {
    if (!ticket || !ticketId) return

    setUpdatingFields((prev) => ({ ...prev, status: true }))

    try {
      const subtaskDecision = subtaskDecisionOverride ?? (await resolveSubtaskStatusGuard(newStatus))
      if (!subtaskDecision.proceed) return

      // All status transitions, including returned_to_dev: send only the new status.
      // The server derives startedAt / completedAt / reason resets from the transition.
      await updateTicket.mutateAsync({
        id: ticketId,
        status: newStatus,
      })

      if (subtaskDecision.closeSubtasks) {
        await closeTicketSubtasksToStatus(subtaskDecision.subtasks, newStatus)
        toast(
          `Status updated. Closed ${subtaskDecision.subtasks.length} open subtask${subtaskDecision.subtasks.length === 1 ? "" : "s"}.`
        )
      } else {
        toast("Status updated")
      }
    } catch (error: any) {
      toast(error.message || "Failed to update ticket", "error")
    } finally {
      setUpdatingFields((prev) => {
        const next = { ...prev }
        delete next.status
        return next
      })
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!ensureCanEdit()) return
    if (!ticket || !ticketId) return
    await performStatusChange(newStatus)
  }
  return {
    handleStatusChange,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    openDeleteDialog: () => {
      if (!ensureCanEdit()) return
      if (!ticket || !ticketId) return
      setIsDeleteDialogOpen(true)
    },
    confirmDelete: async () => {
      if (!ensureCanEdit()) return
      if (!ticket || !ticketId) return

      const body: any = {
        status: "archived",
      }

      try {
        await updateTicketWithToast(body, "Ticket archived", "status")
        setIsDeleteDialogOpen(false)
      } catch (error: any) {
        toast(error.message || "Failed to archive ticket", "error")
      }
    },
  }
}
