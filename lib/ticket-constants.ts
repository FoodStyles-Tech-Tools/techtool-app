/**
 * Shared constants for tickets UI (list, filters, table, kanban).
 */

export const ASSIGNEE_ALLOWED_ROLES = new Set(["admin", "member"])
export const SQA_ALLOWED_ROLES = new Set(["sqa"])
export const ROWS_PER_PAGE = 20
export const UNASSIGNED_VALUE = "unassigned"
export const NO_DEPARTMENT_VALUE = "no_department"

export const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  priority: "Priority",
  type: "Type",
  requested_by_id: "Requested By",
  assignee_id: "Assignee",
  sqa_assignee_id: "SQA Assignee",
  sqa_assigned_at: "SQA Assigned At",
  department_id: "Department",
  due_date: "Due Date",
}

export type SortColumn =
  | "id"
  | "title"
  | "due_date"
  | "type"
  | "department"
  | "status"
  | "priority"
  | "requested_by"
  | "assignee"
  | "sqa_assignee"
  | "sqa_assigned_at"

export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
}
