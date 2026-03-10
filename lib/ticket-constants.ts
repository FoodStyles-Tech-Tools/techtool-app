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
  requestedById: "Requested By",
  assigneeId: "Assignee",
  sqaAssigneeId: "SQA Assignee",
  sqaAssignedAt: "SQA Assigned At",
  departmentId: "Department",
  dueDate: "Due Date",
  epicId: "Epic",
  sprintId: "Sprint",
  parentTicketId: "Parent Ticket",
  assignedAt: "Assigned At",
  startedAt: "Started At",
  completedAt: "Completed At",
  createdAt: "Created At",
}

export type TicketMutationField =
  | "status"
  | "priority"
  | "type"
  | "requestedById"
  | "assigneeId"
  | "sqaAssigneeId"
  | "sqaAssignedAt"
  | "departmentId"
  | "dueDate"
  | "epicId"
  | "sprintId"
  | "parentTicketId"
  | "assignedAt"
  | "startedAt"
  | "completedAt"
  | "createdAt"

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
