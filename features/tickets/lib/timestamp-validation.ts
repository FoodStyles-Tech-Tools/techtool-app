"use client"

import type { Ticket } from "@/lib/types"

export type TicketTimestampField =
  | "created_at"
  | "assigned_at"
  | "sqa_assigned_at"
  | "started_at"
  | "completed_at"

export type TicketTimestampValidation = {
  assigned_at: boolean
  started_at: boolean
  completed_at: boolean
}

export function validateTimestampOrder(
  field: TicketTimestampField,
  value: string | null,
  otherTimestamps: Record<string, string | null>
): boolean {
  if (!value) return true

  const fieldDate = new Date(value)
  if (Number.isNaN(fieldDate.getTime())) return false

  if (field === "created_at") {
    if (otherTimestamps.assigned_at && fieldDate > new Date(otherTimestamps.assigned_at)) return false
    if (otherTimestamps.started_at && fieldDate > new Date(otherTimestamps.started_at)) return false
    if (otherTimestamps.completed_at && fieldDate > new Date(otherTimestamps.completed_at)) return false
  }

  if (field === "assigned_at") {
    if (otherTimestamps.created_at && fieldDate < new Date(otherTimestamps.created_at)) return false
    if (otherTimestamps.started_at && fieldDate > new Date(otherTimestamps.started_at)) return false
    if (otherTimestamps.completed_at && fieldDate > new Date(otherTimestamps.completed_at)) return false
  }

  if (field === "started_at") {
    if (otherTimestamps.created_at && fieldDate < new Date(otherTimestamps.created_at)) return false
    if (otherTimestamps.assigned_at && fieldDate < new Date(otherTimestamps.assigned_at)) return false
    if (otherTimestamps.completed_at && fieldDate > new Date(otherTimestamps.completed_at)) return false
  }

  if (field === "completed_at") {
    if (otherTimestamps.created_at && fieldDate < new Date(otherTimestamps.created_at)) return false
    if (otherTimestamps.assigned_at && fieldDate < new Date(otherTimestamps.assigned_at)) return false
    if (otherTimestamps.started_at && fieldDate < new Date(otherTimestamps.started_at)) return false
  }

  return true
}

export function getTimestampValidation(ticket: Ticket | null | undefined): TicketTimestampValidation {
  if (!ticket) {
    return {
      assigned_at: false,
      started_at: false,
      completed_at: false,
    }
  }

  const status = ticket.status
  const hasStarted = !!ticket.started_at
  const hasCompleted = !!ticket.completed_at
  const hasAssigned = !!ticket.assigned_at
  const hasAssignee = !!ticket.assignee

  return {
    assigned_at: hasAssignee && !hasAssigned,
    started_at: status === "open" ? hasStarted : !hasStarted,
    completed_at:
      status === "open"
        ? hasCompleted
        : status === "completed" || status === "cancelled" || status === "rejected"
          ? !hasCompleted
          : hasCompleted,
  }
}

export function getTimestampWarningMessage(
  ticket: Ticket | null | undefined,
  timestampValidation: TicketTimestampValidation,
  field: "assigned_at" | "started_at" | "completed_at"
): string | null {
  if (!ticket) return null

  const status = ticket.status

  if (field === "assigned_at" && timestampValidation.assigned_at) {
    return "Ticket has an assignee but no assigned date set"
  }

  if (field === "started_at" && timestampValidation.started_at) {
    return status === "open"
      ? "Ticket is open but has a started date"
      : "Ticket is not open but has no started date"
  }

  if (field === "completed_at" && timestampValidation.completed_at) {
    if (status === "open") {
      return "Ticket is open but has a completed date"
    }

    if (status === "completed" || status === "cancelled" || status === "rejected") {
      return "Ticket is completed/cancelled/rejected but has no completed date"
    }

    return "Ticket has a completed date but is not completed/cancelled/rejected"
  }

  return null
}

export function parseTimestamp(timestamp: string | null | undefined): Date | null {
  if (!timestamp) return null
  return new Date(timestamp)
}
