import { buildStatusChangeBody } from "@/lib/ticket-statuses"
import type { Ticket } from "@/lib/types"

export const DONE_STATUS_KEYS = new Set(["completed", "cancelled", "rejected"])

export function buildAssignmentPayload(
  field: "assignee_id" | "sqa_assignee_id",
  currentTicket: Ticket | null | undefined,
  value: string | null | undefined
) {
  const nextValue = value || null
  const now = new Date().toISOString()

  if (field === "assignee_id") {
    const previousValue = currentTicket?.assignee?.id || null
    return {
      assignee_id: nextValue,
      assigned_at: !nextValue ? null : !previousValue || previousValue !== nextValue ? now : undefined,
    }
  }

  const previousValue = currentTicket?.sqa_assignee?.id || null
  return {
    sqa_assignee_id: nextValue,
    sqa_assigned_at: !nextValue ? null : !previousValue || previousValue !== nextValue ? now : undefined,
  }
}

export function buildStatusPayload(currentTicket: Ticket | null | undefined, nextStatus: string) {
  const previousStatus = currentTicket?.status ?? "open"
  const startedAt = currentTicket?.started_at ?? null

  return {
    status: nextStatus,
    ...buildStatusChangeBody(previousStatus, nextStatus, { startedAt }),
  }
}

