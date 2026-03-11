import { buildStatusChangeBody } from "@shared/ticket-statuses"
import type { Ticket } from "@shared/types"

export const DONE_STATUS_KEYS = new Set(["completed", "cancelled", "rejected"])

function toCamelCaseStatusPayload(payload: Record<string, unknown>) {
  const nextPayload: Record<string, unknown> = {}

  if ("status" in payload) nextPayload.status = payload.status
  if ("reason" in payload) nextPayload.reason = payload.reason
  if ("started_at" in payload) nextPayload.startedAt = payload.started_at
  if ("completed_at" in payload) nextPayload.completedAt = payload.completed_at

  return nextPayload
}

export function buildAssignmentPayload(
  field: "assigneeId" | "sqaAssigneeId",
  currentTicket: Ticket | null | undefined,
  value: string | null | undefined
) {
  const nextValue = value || null
  const now = new Date().toISOString()

  if (field === "assigneeId") {
    const previousValue = currentTicket?.assignee?.id || null
    return {
      assigneeId: nextValue,
      assignedAt: !nextValue ? null : !previousValue || previousValue !== nextValue ? now : undefined,
    }
  }

  const previousValue = currentTicket?.sqaAssignee?.id || null
  return {
    sqaAssigneeId: nextValue,
    sqaAssignedAt: !nextValue ? null : !previousValue || previousValue !== nextValue ? now : undefined,
  }
}

export function buildStatusPayload(currentTicket: Ticket | null | undefined, nextStatus: string) {
  const previousStatus = currentTicket?.status ?? "open"
  const startedAt = currentTicket?.startedAt ?? null

  return toCamelCaseStatusPayload({
    status: nextStatus,
    ...buildStatusChangeBody(previousStatus, nextStatus, { startedAt }),
  })
}
