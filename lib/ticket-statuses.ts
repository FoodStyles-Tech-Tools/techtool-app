export type TicketStatus = {
  key: string
  label: string
  color: string
  sort_order: number
}

export const DEFAULT_TICKET_STATUSES: TicketStatus[] = [
  { key: "open", label: "Open", sort_order: 1, color: "#9ca3af" },
  { key: "in_progress", label: "In Progress", sort_order: 2, color: "#f59e0b" },
  { key: "blocked", label: "Blocked", sort_order: 3, color: "#a855f7" },
  { key: "for_qa", label: "For QA", sort_order: 4, color: "#38bdf8" },
  { key: "qa_pass", label: "QA Pass", sort_order: 5, color: "#14b8a6" },
  { key: "completed", label: "Completed", sort_order: 6, color: "#22c55e" },
  { key: "cancelled", label: "Cancelled", sort_order: 7, color: "#ef4444" },
]

export const normalizeStatusKey = (value: string) =>
  value
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

export const isDoneStatus = (key: string) =>
  key === "completed" || key === "cancelled"
