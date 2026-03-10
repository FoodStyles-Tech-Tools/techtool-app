"use client"

import { useCallback, useState } from "react"
import { toast } from "@/components/ui/toast"
import { buildStatusChangeBody } from "@/lib/ticket-statuses"
import type { Ticket } from "@/lib/types"
import { isRichTextEmpty, normalizeRichTextInput, richTextToPlainText } from "@/lib/rich-text"
import { FIELD_LABELS } from "@/lib/ticket-constants"
import {
  closeTicketSubtasksToStatus,
  resolveTicketDoneStatusGuard,
} from "@/features/tickets/api/client"
import { buildAssignmentPayload, buildStatusPayload, DONE_STATUS_KEYS } from "@/features/tickets/lib/update-payloads"
import type { TicketStatusGuardResult, TicketSubtaskDecision, TicketSubtaskRow } from "@/features/tickets/types"

type PendingStatusChange = {
  ticketId: string
  newStatus: string
  body: Record<string, unknown>
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
  updateTicketWithReasonComment: MutationClient
}

export function useTicketBoardActions({
  allTickets,
  projectFilter,
  askHowToHandleOpenSubtasks,
  updateTicket,
  updateTicketWithReasonComment,
}: UseTicketBoardActionsParams) {
  const [updatingFields, setUpdatingFields] = useState<Record<string, string>>({})
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isTicketDialogOpen, setTicketDialogOpen] = useState(false)
  const [showCancelReasonDialog, setShowCancelReasonDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [showReturnedReasonDialog, setShowReturnedReasonDialog] = useState(false)
  const [returnedReason, setReturnedReason] = useState("")
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null)
  const [pendingReturnedStatusChange, setPendingReturnedStatusChange] = useState<PendingStatusChange | null>(null)
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
    if (projectFilter === "all") {
      toast("Select a project before creating an epic", "error")
      return
    }
    setIsEpicDialogOpen(true)
  }, [projectFilter])

  const handleOpenCreateSprint = useCallback(() => {
    if (projectFilter === "all") {
      toast("Select a project before creating a sprint", "error")
      return
    }
    setIsSprintDialogOpen(true)
  }, [projectFilter])

  const handleKanbanDrop = useCallback(
    async (ticketId: string, columnId: string): Promise<boolean> => {
      const ticket = allTickets.find((candidate) => candidate.id === ticketId)
      if (!ticket || ticket.status === columnId) return false
      const previousStatus = ticket.status
      const startedAt = (ticket as { started_at?: string | null }).started_at

      if (columnId === "cancelled" || columnId === "rejected") {
        const statusBody = buildStatusChangeBody(previousStatus, columnId, { startedAt })
        setPendingStatusChange({
          ticketId,
          newStatus: columnId,
          body: { status: columnId, ...statusBody },
        })
        setCancelReason("")
        setShowCancelReasonDialog(true)
        return false
      }

      if (columnId === "returned_to_dev" && previousStatus !== "returned_to_dev") {
        const statusBody = buildStatusChangeBody(previousStatus, columnId, { startedAt })
        setPendingReturnedStatusChange({
          ticketId,
          newStatus: columnId,
          body: { status: columnId, ...statusBody },
        })
        setReturnedReason("")
        setShowReturnedReasonDialog(true)
        return false
      }

      const body = {
        status: columnId,
        ...buildStatusChangeBody(previousStatus, columnId, { startedAt }),
      }

      try {
        const doneGuard = await resolveDoneStatusGuard(ticketId, columnId)
        if (!doneGuard.proceed) return false

        await updateTicket.mutateAsync({ id: ticketId, ...body })
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
    const label = `[${projectName}] ${ticket.display_id || ticket.id.slice(0, 8)}_${ticket.title}`
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
    async (ticketId: string, field: string, value: string | null | undefined) => {
      const currentTicket = allTickets.find((ticket) => ticket.id === ticketId)

      let doneGuard: TicketStatusGuardResult | null = null
      const body: any = {}
      if (field === "requested_by_id") {
        if (!value) {
          toast("Requested by cannot be empty", "error")
          return
        }
        body[field] = value
      } else if (field === "assignee_id") {
        Object.assign(body, buildAssignmentPayload("assignee_id", currentTicket, value))
      } else if (field === "sqa_assignee_id") {
        Object.assign(body, buildAssignmentPayload("sqa_assignee_id", currentTicket, value))
      } else if (field === "status") {
        const previousStatus = currentTicket?.status ?? "open"
        const newStatus = value as string

        if ((newStatus === "cancelled" || newStatus === "rejected") && previousStatus !== newStatus) {
          const statusBody = buildStatusChangeBody(previousStatus, newStatus, {
            startedAt: (currentTicket as { started_at?: string | null })?.started_at,
          })
          Object.assign(body, statusBody)
          body[field] = newStatus
          setPendingStatusChange({ ticketId, newStatus, body })
          setCancelReason("")
          setShowCancelReasonDialog(true)
          return
        }
        if (newStatus === "returned_to_dev" && previousStatus !== "returned_to_dev") {
          const statusBody = buildStatusChangeBody(previousStatus, newStatus, {
            startedAt: (currentTicket as { started_at?: string | null })?.started_at,
          })
          Object.assign(body, statusBody)
          body[field] = newStatus
          setPendingReturnedStatusChange({ ticketId, newStatus, body })
          setReturnedReason("")
          setShowReturnedReasonDialog(true)
          return
        }

        Object.assign(body, buildStatusPayload(currentTicket, newStatus))
        if (DONE_STATUS_KEYS.has(newStatus) && previousStatus !== newStatus) {
          doneGuard = await resolveDoneStatusGuard(ticketId, newStatus)
          if (!doneGuard.proceed) return
        }
      } else if (field === "department_id") {
        body[field] = value || null
      } else {
        body[field] = value
      }

      const cellKey = `${ticketId}-${field}`
      setUpdatingFields((previous) => ({ ...previous, [cellKey]: field }))

      try {
        await updateTicket.mutateAsync({
          id: ticketId,
          ...body,
        })
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

  const handleCancelReasonCancel = useCallback(() => {
    setShowCancelReasonDialog(false)
    setPendingStatusChange(null)
    setCancelReason("")
  }, [])

  const handleCancelReasonConfirm = useCallback(async () => {
    if (!cancelReason.trim()) {
      toast("Please provide a reason", "error")
      return
    }

    if (!pendingStatusChange) return

    const { ticketId, body, newStatus } = pendingStatusChange
    const doneGuard = await resolveDoneStatusGuard(ticketId, newStatus)
    if (!doneGuard.proceed) return

    const normalizedReason = normalizeRichTextInput(cancelReason.trim())
    if (!normalizedReason) {
      toast("Please provide a reason", "error")
      return
    }

    const reasonKey = newStatus === "rejected" ? "rejected" : "cancelled"
    const reasonTimestampKey = newStatus === "rejected" ? "rejectedAt" : "cancelledAt"
    const reasonHeading = newStatus === "rejected" ? "Reject Reason" : "Cancelled Reason"
    const finalBody = {
      ...body,
      reason: { [reasonKey]: { reason: cancelReason.trim(), [reasonTimestampKey]: new Date().toISOString() } },
    }
    const commentBody = `<p><strong>${reasonHeading}</strong></p>${normalizedReason}`

    setShowCancelReasonDialog(false)
    setPendingStatusChange(null)

    const cellKey = `${ticketId}-status`
    setUpdatingFields((previous) => ({ ...previous, [cellKey]: "status" }))

    try {
      const payload: {
        id: string
        status: "cancelled" | "rejected"
        reason: unknown
        reasonCommentBody: string
        startedAt?: string | null
        completedAt?: string | null
        epicId?: string | null
      } = {
        id: ticketId,
        status: newStatus as "cancelled" | "rejected",
        reason: finalBody.reason,
        reasonCommentBody: commentBody,
      }

      if ("started_at" in finalBody) {
        payload.startedAt = (finalBody as { started_at?: string | null }).started_at ?? null
      }
      if ("completed_at" in finalBody) {
        payload.completedAt = (finalBody as { completed_at?: string | null }).completed_at ?? null
      }
      if ("epic_id" in finalBody) {
        payload.epicId = (finalBody as { epic_id?: string | null }).epic_id ?? null
      }

      await updateTicketWithReasonComment.mutateAsync(payload)
      if (doneGuard.closeSubtasks) {
        await closeTicketSubtasksToStatus(doneGuard.subtasks, newStatus)
        toast(`Status updated. Closed ${doneGuard.subtasks.length} open subtask${doneGuard.subtasks.length === 1 ? "" : "s"}.`)
      } else {
        toast("Status updated")
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

    setCancelReason("")
  }, [cancelReason, pendingStatusChange, resolveDoneStatusGuard, updateTicketWithReasonComment])

  const handleReturnedReasonCancel = useCallback(() => {
    setShowReturnedReasonDialog(false)
    setPendingReturnedStatusChange(null)
    setReturnedReason("")
  }, [])

  const handleReturnedReasonConfirm = useCallback(async () => {
    if (isRichTextEmpty(returnedReason)) {
      toast("Please provide a reason for returning to development", "error")
      return
    }

    if (!pendingReturnedStatusChange) return
    const normalizedReason = normalizeRichTextInput(returnedReason)
    if (!normalizedReason) {
      toast("Please provide a reason for returning to development", "error")
      return
    }

    const { ticketId, body } = pendingReturnedStatusChange
    const plainReason = richTextToPlainText(normalizedReason).trim()
    const commentBody = `<p><strong>Returned to Dev Reason</strong></p>${normalizedReason}`

    setShowReturnedReasonDialog(false)
    setPendingReturnedStatusChange(null)

    const cellKey = `${ticketId}-status`
    setUpdatingFields((previous) => ({ ...previous, [cellKey]: "status" }))

    try {
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
            reason: plainReason,
            returnedAt: new Date().toISOString(),
          },
        },
        reasonCommentBody: commentBody,
      }

      if ("started_at" in body) {
        payload.startedAt = (body as { started_at?: string | null }).started_at ?? null
      }
      if ("completed_at" in body) {
        payload.completedAt = (body as { completed_at?: string | null }).completed_at ?? null
      }
      if ("epic_id" in body) {
        payload.epicId = (body as { epic_id?: string | null }).epic_id ?? null
      }

      await updateTicketWithReasonComment.mutateAsync(payload)
      toast("Status updated")
    } catch (error: any) {
      toast(error.message || "Failed to update ticket", "error")
    } finally {
      setUpdatingFields((previous) => {
        const next = { ...previous }
        delete next[cellKey]
        return next
      })
    }

    setReturnedReason("")
  }, [pendingReturnedStatusChange, returnedReason, updateTicketWithReasonComment])

  return {
    updatingFields,
    selectedTicketId,
    setSelectedTicketId,
    isTicketDialogOpen,
    setTicketDialogOpen,
    showCancelReasonDialog,
    cancelReason,
    setCancelReason,
    showReturnedReasonDialog,
    returnedReason,
    setReturnedReason,
    isEpicDialogOpen,
    setIsEpicDialogOpen,
    isSprintDialogOpen,
    setIsSprintDialogOpen,
    handleOpenCreateEpic,
    handleOpenCreateSprint,
    handleKanbanDrop,
    handleCopyTicketLabel,
    updateTicketField,
    pendingStatusKind: (pendingStatusChange?.newStatus as "cancelled" | "rejected" | null) ?? null,
    handleCancelReasonCancel,
    handleCancelReasonConfirm,
    handleReturnedReasonCancel,
    handleReturnedReasonConfirm,
  }
}
