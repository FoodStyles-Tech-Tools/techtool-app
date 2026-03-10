"use client"

import { useEffect, useState, type KeyboardEvent } from "react"
import { toast } from "@/components/ui/toast"
import type { Ticket } from "@/lib/types"
import { normalizeRichTextInput } from "@/lib/rich-text"
import {
  getTimestampValidation,
  getTimestampWarningMessage,
  parseTimestamp,
  validateTimestampOrder,
  type TicketTimestampField,
} from "@/features/tickets/lib/timestamp-validation"
import { buildAssignmentPayload } from "@/features/tickets/lib/update-payloads"
import { useTicketDetailLinkActions } from "@/features/tickets/hooks/use-ticket-detail-link-actions"
import { useTicketDetailSharing } from "@/features/tickets/hooks/use-ticket-detail-sharing"
import { useTicketDetailStatusActions } from "@/features/tickets/hooks/use-ticket-detail-status-actions"
import type { TicketSubtaskDecision, TicketSubtaskRow } from "@/features/tickets/types"

const toUTCISOStringPreserveLocal = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString()

const TIMESTAMP_FIELD_TO_UPDATE_KEY: Record<TicketTimestampField, string> = {
  created_at: "createdAt",
  assigned_at: "assignedAt",
  sqa_assigned_at: "sqaAssignedAt",
  started_at: "startedAt",
  completed_at: "completedAt",
}

type MutationClient = {
  mutateAsync: (input: any) => Promise<unknown>
}

type UseTicketDetailActionsParams = {
  ticketId: string | null
  open: boolean
  ticket: Ticket | null | undefined
  canEditTickets: boolean
  isAssignmentLocked: boolean
  isSqaEditLocked: boolean
  currentUserId: string | null | undefined
  askHowToHandleOpenSubtasks: (
    targetStatus: string,
    subtasks: TicketSubtaskRow[]
  ) => Promise<TicketSubtaskDecision>
  updateTicket: MutationClient
  updateTicketWithReasonComment: MutationClient
}

export function useTicketDetailActions({
  ticketId,
  open,
  ticket,
  canEditTickets,
  isAssignmentLocked,
  isSqaEditLocked,
  currentUserId,
  askHowToHandleOpenSubtasks,
  updateTicket,
  updateTicketWithReasonComment,
}: UseTicketDetailActionsParams) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [titleValue, setTitleValue] = useState("")
  const [descriptionValue, setDescriptionValue] = useState("")
  const [updatingFields, setUpdatingFields] = useState<Record<string, boolean>>({})
  const [isSubtasksCollapsed, setIsSubtasksCollapsed] = useState(true)
  const [includeInactiveProjects, setIncludeInactiveProjects] = useState(false)

  useEffect(() => {
    if (ticket) {
      setTitleValue(ticket.title || "")
      setDescriptionValue(ticket.description || "")
    }
  }, [ticket])

  useEffect(() => {
    if (!open) {
      setIsEditingTitle(false)
      setIsEditingDescription(false)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setIsSubtasksCollapsed(true)
    }
  }, [open, ticketId])

  const ensureCanEdit = (options?: { allowWhenUnassigned?: boolean; allowSqaSelfAssign?: boolean }) => {
    if (!canEditTickets) {
      toast("You do not have permission to edit tickets.", "error")
      return false
    }
    if (isSqaEditLocked && !options?.allowSqaSelfAssign) {
      toast("Assign yourself as SQA before editing this ticket.", "error")
      return false
    }
    if (isAssignmentLocked && !options?.allowWhenUnassigned) {
      toast("Assign this ticket before editing other fields.", "error")
      return false
    }
    return true
  }

  const updateTicketWithToast = async (
    updates: Record<string, any>,
    successMessage: string,
    fieldName?: string
  ) => {
    if (!ticket || !ticketId) return

    if (fieldName) {
      setUpdatingFields((prev) => ({ ...prev, [fieldName]: true }))
    }

    try {
      await updateTicket.mutateAsync({
        id: ticketId,
        ...updates,
      })
      toast(successMessage)
    } catch (error: any) {
      toast(error.message || "Failed to update ticket", "error")
    } finally {
      if (fieldName) {
        setUpdatingFields((prev) => {
          const next = { ...prev }
          delete next[fieldName]
          return next
        })
      }
    }
  }

  const handleTypeChange = (newType: string) => {
    if (!ensureCanEdit()) return
    void updateTicketWithToast({ type: newType }, "Type updated", "type")
  }

  const handlePriorityChange = (newPriority: string) => {
    if (!ensureCanEdit()) return
    void updateTicketWithToast({ priority: newPriority }, "Priority updated", "priority")
  }

  const handleDueDateChange = (value: Date | null) => {
    if (!ensureCanEdit()) return
    void updateTicketWithToast(
      { dueDate: value ? toUTCISOStringPreserveLocal(value) : null },
      value ? "Due date updated" : "Due date cleared",
      "dueDate"
    )
  }

  const handleDepartmentChange = (newDepartmentId: string, noDepartmentValue: string) => {
    if (!ensureCanEdit()) return
    void updateTicketWithToast(
      { departmentId: newDepartmentId === noDepartmentValue ? null : newDepartmentId },
      "Department updated",
      "departmentId"
    )
  }

  const handleEpicChange = (newEpicId: string | null) => {
    if (!ensureCanEdit()) return
    void updateTicketWithToast({ epicId: newEpicId }, "Epic updated", "epicId")
  }

  const handleSprintChange = (newSprintId: string | null) => {
    if (!ensureCanEdit()) return
    void updateTicketWithToast({ sprintId: newSprintId }, "Sprint updated", "sprintId")
  }

  const handleProjectChange = (newProjectId: string, noProjectValue: string) => {
    if (!ensureCanEdit()) return
    void updateTicketWithToast(
      { projectId: newProjectId === noProjectValue ? null : newProjectId },
      "Project updated",
      "projectId"
    )
  }

  const handleParentTicketChange = async (
    newParentTicketId: string,
    noParentTicketValue: string
  ) => {
    if (!ensureCanEdit()) return
    if (!ticket) return

    const nextParentId = newParentTicketId === noParentTicketValue ? null : newParentTicketId
    const currentParentId = ticket.parentTicketId || null
    if (nextParentId === currentParentId) return

    const updates: Record<string, any> = { parentTicketId: nextParentId }
    if (nextParentId && ticket.type !== "subtask") {
      updates.type = "subtask"
    }

    await updateTicketWithToast(
      updates,
      nextParentId ? "Parent ticket linked" : "Parent ticket removed",
      "parentTicketId"
    )
  }

  const handleAssigneeChange = async (newAssigneeId: string | null) => {
    if (!ensureCanEdit({ allowWhenUnassigned: true })) return
    if (!ticket) return

    await updateTicketWithToast(
      buildAssignmentPayload("assigneeId", ticket, newAssigneeId),
      "Assignee updated",
      "assigneeId"
    )
  }

  const handleRequestedByChange = (newRequestedById: string) => {
    if (!ensureCanEdit()) return
    if (!newRequestedById) {
      toast("Requested by cannot be empty", "error")
      return
    }
    void updateTicketWithToast(
      { requestedById: newRequestedById },
      "Requested by updated",
      "requestedById"
    )
  }

  const handleSqaAssigneeChange = async (newSqaAssigneeId: string | null) => {
    const canSelfAssignAsSqa = !!currentUserId && newSqaAssigneeId === currentUserId
    if (!ensureCanEdit({ allowSqaSelfAssign: canSelfAssignAsSqa })) return
    if (!ticket) return

    await updateTicketWithToast(
      buildAssignmentPayload("sqaAssigneeId", ticket, newSqaAssigneeId),
      "SQA assignee updated",
      "sqaAssigneeId"
    )
  }

  const handleTitleSave = async () => {
    if (!ensureCanEdit()) {
      setIsEditingTitle(false)
      return
    }
    if (!ticket) return
    if (titleValue.trim() === ticket.title) {
      setIsEditingTitle(false)
      return
    }
    await updateTicketWithToast({ title: titleValue.trim() }, "Title updated")
    setIsEditingTitle(false)
  }

  const handleDescriptionSave = async () => {
    if (!ensureCanEdit()) {
      setIsEditingDescription(false)
      return
    }
    if (!ticket) return

    const normalizedDescription = normalizeRichTextInput(descriptionValue)
    const currentDescription = normalizeRichTextInput(ticket.description)
    if (normalizedDescription === currentDescription) {
      setIsEditingDescription(false)
      return
    }

    await updateTicketWithToast({ description: normalizedDescription }, "Description updated")
    setIsEditingDescription(false)
  }

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      void handleTitleSave()
    } else if (event.key === "Escape") {
      setTitleValue(ticket?.title || "")
      setIsEditingTitle(false)
    }
  }

  const handleTimestampChange = async (field: TicketTimestampField, value: Date | null) => {
    if (!ensureCanEdit()) return
    if (!ticket) return

    const dateValue = value ? value.toISOString() : null
    const status = ticket.status
    const effectiveCompletedAt =
      status === "completed" || status === "cancelled" || status === "rejected"
        ? field === "completed_at"
          ? dateValue
          : ticket.completedAt || null
        : null

    const timestampMap: Record<string, string | null> = {
      created_at: field === "created_at" ? dateValue : ticket.createdAt || null,
      assigned_at: field === "assigned_at" ? dateValue : ticket.assignedAt || null,
      sqa_assigned_at: field === "sqa_assigned_at" ? dateValue : ticket.sqaAssignedAt || null,
      started_at: field === "started_at" ? dateValue : ticket.startedAt || null,
      completed_at: effectiveCompletedAt,
    }

    if (!validateTimestampOrder(field, dateValue, timestampMap)) {
      toast(
        "Invalid timestamp: Timestamps must follow the order: created_at <= assigned_at <= started_at <= completed_at",
        "error"
      )
      return
    }

    const updates: any = { [field]: dateValue }
    if (
      field === "started_at" &&
      (status === "in_progress" || status === "blocked") &&
      ticket.completedAt
    ) {
      updates.completedAt = null
    }

    if (
      field === "completed_at" &&
      status !== "completed" &&
      status !== "cancelled" &&
      status !== "rejected"
    ) {
      toast("Cannot set completed_at when status is not completed, cancelled, or rejected", "error")
      return
    }

    await updateTicketWithToast(
      updates,
      `${field.replace("_", " ")} updated`,
      TIMESTAMP_FIELD_TO_UPDATE_KEY[field]
    )
  }

  const timestampValidation = getTimestampValidation(ticket)
  const linkActions = useTicketDetailLinkActions({
    ticket,
    ensureCanEdit,
    updateTicketWithToast,
  })
  const sharing = useTicketDetailSharing({ ticket })
  const statusActions = useTicketDetailStatusActions({
    ticketId,
    ticket,
    ensureCanEdit,
    askHowToHandleOpenSubtasks,
    updateTicket,
    updateTicketWithReasonComment,
    updateTicketWithToast,
    setUpdatingFields,
  })

  return {
    isEditingTitle,
    setIsEditingTitle,
    isEditingDescription,
    setIsEditingDescription,
    titleValue,
    setTitleValue,
    descriptionValue,
    setDescriptionValue,
    updatingFields,
    isSubtasksCollapsed,
    setIsSubtasksCollapsed,
    includeInactiveProjects,
    setIncludeInactiveProjects,
    timestampValidation,
    parseTimestamp,
    getTimestampWarningMessage: (field: "assigned_at" | "started_at" | "completed_at") =>
      getTimestampWarningMessage(ticket, timestampValidation, field),
    handleTypeChange,
    handlePriorityChange,
    handleDueDateChange,
    handleDepartmentChange,
    handleEpicChange,
    handleSprintChange,
    handleProjectChange,
    handleParentTicketChange,
    handleAssigneeChange,
    handleRequestedByChange,
    handleSqaAssigneeChange,
    handleTitleSave,
    handleDescriptionSave,
    handleTitleKeyDown,
    handleTimestampChange,
    ...linkActions,
    ...sharing,
    ...statusActions,
  }
}
