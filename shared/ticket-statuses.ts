export type TicketStatus = {
  key: string
  label: string
  color: string
  sort_order: number
  sqa_flow: boolean
}

export const DEFAULT_TICKET_STATUSES: TicketStatus[] = [
  { key: "open", label: "Open", sort_order: 1, color: "#9ca3af", sqa_flow: false },
  { key: "in_progress", label: "In Progress", sort_order: 2, color: "#f59e0b", sqa_flow: false },
  { key: "blocked", label: "Blocked", sort_order: 3, color: "#a855f7", sqa_flow: false },
  { key: "for_qa", label: "For QA", sort_order: 4, color: "#38bdf8", sqa_flow: true },
  { key: "qa_pass", label: "QA Pass", sort_order: 5, color: "#14b8a6", sqa_flow: true },
  { key: "completed", label: "Completed", sort_order: 6, color: "#22c55e", sqa_flow: false },
  { key: "cancelled", label: "Cancelled", sort_order: 7, color: "#ef4444", sqa_flow: false },
]

export const normalizeStatusKey = (value: string | null | undefined): string =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")

export const sortTicketStatuses = (statuses: TicketStatus[]) =>
  [...statuses].sort((a, b) => {
    const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
    if (orderDiff !== 0) return orderDiff
    return a.label.localeCompare(b.label)
  })

export const formatStatusLabel = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const isArchivedStatus = (key: string) =>
  normalizeStatusKey(key) === "archived"

export const isDoneStatus = (key: string) =>
  key === "completed" || key === "cancelled" || key === "rejected"

export const filterStatusesBySqaRequirement = (
  statuses: TicketStatus[],
  requireSqa: boolean
) => (requireSqa ? statuses : statuses.filter((status) => status.sqa_flow !== true))

/** Build API body for a status change (started_at, completed_at, reason). Caller adds status and optional reason. */
export function buildStatusChangeBody(
  previousStatus: string,
  newStatus: string,
  options?: { startedAt?: string | null }
): Record<string, unknown> {
  const now = new Date().toISOString()
  const body: Record<string, unknown> = {}

  if ((previousStatus === "open" || previousStatus === "blocked") && newStatus !== "open" && newStatus !== "blocked") {
    body.started_at = now
  }
  if (newStatus === "completed" || newStatus === "cancelled" || newStatus === "rejected") {
    body.completed_at = now
    if (!options?.startedAt) body.started_at = now
  }
  if (
    (previousStatus === "completed" || previousStatus === "cancelled" || previousStatus === "rejected") &&
    newStatus !== "completed" &&
    newStatus !== "cancelled" &&
    newStatus !== "rejected"
  ) {
    body.completed_at = null
    body.reason = null
  }
  if (previousStatus === "in_progress" && (newStatus === "blocked" || newStatus === "open")) {
    body.started_at = null
  }
  if (newStatus === "open") {
    body.started_at = null
    body.completed_at = null
  }
  return body
}
