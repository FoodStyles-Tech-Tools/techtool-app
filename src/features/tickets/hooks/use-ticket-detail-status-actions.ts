"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import { toast } from "@client/components/ui/toast"
import type { Ticket } from "@shared/types"
import { isRichTextEmpty, normalizeRichTextInput, richTextToPlainText } from "@shared/rich-text"
import {
  closeTicketSubtasksToStatus,
  resolveTicketDoneStatusGuard,
} from "@client/features/tickets/api/client"
import { buildStatusPayload } from "@client/features/tickets/lib/update-payloads"
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
  updateTicketWithReasonComment: MutationClient
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
  updateTicketWithReasonComment,
  updateTicketWithToast,
  setUpdatingFields,
}: UseTicketDetailStatusActionsParams) {
  const [showCancelReasonDialog, setShowCancelReasonDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [showDeleteReasonDialog, setShowDeleteReasonDialog] = useState(false)
  const [deleteReason, setDeleteReason] = useState("")
  const [showReturnedReasonDialog, setShowReturnedReasonDialog] = useState(false)
  const [returnedReason, setReturnedReason] = useState("")
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null)

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
    returnedToDevReasonRichText?: string,
    subtaskDecisionOverride?: TicketStatusGuardResult
  ) => {
    if (!ticket || !ticketId) return

    const updates: any = buildStatusPayload(ticket, newStatus)
    setUpdatingFields((prev) => ({ ...prev, status: true }))

    try {
      const subtaskDecision = subtaskDecisionOverride ?? (await resolveSubtaskStatusGuard(newStatus))
      if (!subtaskDecision.proceed) return

      if (newStatus === "returned_to_dev" && returnedToDevReasonRichText) {
        const payload: {
          id: string
          status: "returned_to_dev"
          reason: unknown
          reasonCommentBody: string
          startedAt?: string | null
          completedAt?: string | null
          epicId?: string | null
        } = {
          id: ticketId,
          status: "returned_to_dev",
          reason: {
            returned_to_dev: {
              reason: richTextToPlainText(returnedToDevReasonRichText).trim(),
              returnedAt: new Date().toISOString(),
            },
          },
          reasonCommentBody: `<p><strong>Returned to Dev Reason</strong></p>${returnedToDevReasonRichText}`,
        }

        if ("startedAt" in updates) {
          payload.startedAt = (updates as { startedAt?: string | null }).startedAt ?? null
        }
        if ("completedAt" in updates) {
          payload.completedAt = (updates as { completedAt?: string | null }).completedAt ?? null
        }
        if ("epicId" in updates) {
          payload.epicId = (updates as { epicId?: string | null }).epicId ?? null
        }

        await updateTicketWithReasonComment.mutateAsync(payload)
      } else {
        await updateTicket.mutateAsync({
          id: ticketId,
          ...updates,
        })
      }

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

    if ((newStatus === "cancelled" || newStatus === "rejected") && ticket.status !== newStatus) {
      setPendingStatusChange(newStatus)
      setCancelReason("")
      setShowCancelReasonDialog(true)
      return
    }

    if (newStatus === "returned_to_dev" && ticket.status !== "returned_to_dev") {
      setPendingStatusChange(newStatus)
      setReturnedReason("")
      setShowReturnedReasonDialog(true)
      return
    }

    await performStatusChange(newStatus)
  }

  const handleReturnedReasonSubmit = async () => {
    if (!ensureCanEdit()) return
    if (!ticket || !ticketId) return
    if (isRichTextEmpty(returnedReason)) {
      toast("Please provide a reason for returning to development", "error")
      return
    }

    const normalizedReason = normalizeRichTextInput(returnedReason)
    if (!normalizedReason) {
      toast("Please provide a reason for returning to development", "error")
      return
    }

    const newStatus = pendingStatusChange || "returned_to_dev"
    setShowReturnedReasonDialog(false)
    setPendingStatusChange(null)

    try {
      const subtaskDecision = await resolveSubtaskStatusGuard(newStatus)
      if (!subtaskDecision.proceed) return

      await performStatusChange(newStatus, normalizedReason, subtaskDecision)
      setReturnedReason("")
    } catch (error: any) {
      toast(error.message || "Failed to return ticket to development", "error")
    }
  }

  const handleCancelReasonSubmit = async () => {
    if (!ensureCanEdit()) return
    if (!cancelReason.trim()) {
      toast("Please provide a reason", "error")
      return
    }
    if (!ticket || !ticketId) return

    setShowCancelReasonDialog(false)
    const newStatus = pendingStatusChange || "cancelled"
    setPendingStatusChange(null)

    const normalizedReason = normalizeRichTextInput(cancelReason.trim())
    if (!normalizedReason) {
      toast("Please provide a reason", "error")
      return
    }

    const reasonKey = newStatus === "rejected" ? "rejected" : "cancelled"
    const reasonTimestampKey = newStatus === "rejected" ? "rejectedAt" : "cancelledAt"
    const reasonHeading = newStatus === "rejected" ? "Reject Reason" : "Cancelled Reason"
    const commentBody = `<p><strong>${reasonHeading}</strong></p>${normalizedReason}`
    const updates: any = {
      ...buildStatusPayload(ticket, newStatus),
      reason: {
        [reasonKey]: {
          reason: cancelReason.trim(),
          [reasonTimestampKey]: new Date().toISOString(),
        },
      },
    }

    try {
      const subtaskDecision = await resolveSubtaskStatusGuard(newStatus)
      if (!subtaskDecision.proceed) return

      await updateTicketWithReasonComment.mutateAsync({
        id: ticketId,
        status: newStatus as "cancelled" | "rejected",
        reason: updates.reason,
        reasonCommentBody: commentBody,
        ...(updates.startedAt !== undefined ? { startedAt: updates.startedAt ?? null } : {}),
        ...(updates.completedAt !== undefined ? { completedAt: updates.completedAt ?? null } : {}),
      })
      toast("Status updated")
      if (subtaskDecision.closeSubtasks) {
        await closeTicketSubtasksToStatus(subtaskDecision.subtasks, newStatus)
        toast(
          `Closed ${subtaskDecision.subtasks.length} open subtask${subtaskDecision.subtasks.length === 1 ? "" : "s"}.`
        )
      }
      setCancelReason("")
    } catch (error: any) {
      toast(error.message || "Failed to update ticket", "error")
    }
  }

  const handleDeleteReasonSubmit = async () => {
    if (!ensureCanEdit()) return
    if (!ticket || !ticketId) return
    if (!deleteReason.trim()) {
      toast("Please provide a reason for deleting this ticket", "error")
      return
    }

    const normalizedReason = normalizeRichTextInput(deleteReason.trim())
    if (!normalizedReason) {
      toast("Please provide a reason for deleting this ticket", "error")
      return
    }

    const body: any = {
      status: "archived",
      reason: {
        ...(ticket.reason || {}),
        archived: {
          reason: deleteReason.trim(),
          archivedAt: new Date().toISOString(),
        },
      },
    }

    try {
      await updateTicketWithToast(body, "Ticket archived", "status")
      setShowDeleteReasonDialog(false)
      setDeleteReason("")
    } catch (error: any) {
      toast(error.message || "Failed to archive ticket", "error")
    }
  }

  return {
    showCancelReasonDialog,
    cancelReason,
    setCancelReason,
    showDeleteReasonDialog,
    deleteReason,
    setDeleteReason,
    showReturnedReasonDialog,
    returnedReason,
    setReturnedReason,
    pendingStatusChange,
    handleStatusChange,
    handleReturnedReasonSubmit,
    handleCancelReasonSubmit,
    handleDeleteReasonSubmit,
    openDeleteDialog: () => {
      setDeleteReason("")
      setShowDeleteReasonDialog(true)
    },
    closeCancelReasonDialog: () => {
      setShowCancelReasonDialog(false)
      setPendingStatusChange(null)
      setCancelReason("")
    },
    closeDeleteReasonDialog: () => {
      setShowDeleteReasonDialog(false)
      setDeleteReason("")
    },
    closeReturnedReasonDialog: () => {
      setShowReturnedReasonDialog(false)
      setPendingStatusChange(null)
      setReturnedReason("")
    },
  }
}
