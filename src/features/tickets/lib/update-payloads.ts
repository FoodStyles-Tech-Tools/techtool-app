export const DONE_STATUS_KEYS = new Set(["completed", "cancelled", "rejected"])

/**
 * Build the assignee/sqa-assignee patch payload.
 * Timestamps (assignedAt / sqaAssignedAt) are intentionally omitted here;
 * the server derives them from the previous value and the incoming assignee.
 */
export function buildAssignmentPayload(
  field: "assigneeId" | "sqaAssigneeId",
  value: string | null | undefined
) {
  const nextValue = value || null
  if (field === "assigneeId") {
    return { assigneeId: nextValue }
  }
  return { sqaAssigneeId: nextValue }
}

/**
 * Build the status patch payload.
 * Timestamp fields (startedAt / completedAt / reason) are intentionally omitted;
 * the server derives them from the previous status and the incoming status.
 */
export function buildStatusPayload(nextStatus: string) {
  return { status: nextStatus }
}
