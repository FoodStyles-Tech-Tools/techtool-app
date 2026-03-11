import { z } from "zod"
import { parseTicketListQuery, type TicketListQuery } from "@/lib/server/tickets-list"

const SORT_COLUMNS = [
  "id",
  "title",
  "due_date",
  "type",
  "department",
  "status",
  "priority",
  "requested_by",
  "assignee",
  "sqa_assignee",
  "sqa_assigned_at",
] as const

function asRecord(input: unknown) {
  return z.record(z.string(), z.unknown()).parse(input)
}

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function readCompatValue<T = unknown>(
  body: Record<string, unknown>,
  camelKey: string,
  snakeKey?: string
): T | undefined {
  if (hasOwn(body, camelKey)) {
    return body[camelKey] as T
  }

  if (snakeKey && hasOwn(body, snakeKey)) {
    return body[snakeKey] as T
  }

  return undefined
}

const optionalNullableString = z.union([z.string().trim().min(1), z.null()]).optional()
const optionalString = z.string().trim().min(1).optional()
const optionalLinks = z.union([z.array(z.string()), z.null()]).optional()

const ticketIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Ticket id is required"),
})

const createTicketBodySchema = z.object({
  projectId: optionalNullableString,
  title: z.string().trim().min(1, "Title is required"),
  description: z.union([z.string(), z.null()]).optional(),
  assigneeId: optionalNullableString,
  sqaAssigneeId: optionalNullableString,
  sqaAssignedAt: z.union([z.string(), z.null()]).optional(),
  requestedById: optionalNullableString,
  priority: optionalString,
  type: optionalString,
  status: optionalString,
  departmentId: optionalNullableString,
  epicId: optionalNullableString,
  sprintId: optionalNullableString,
  parentTicketId: optionalNullableString,
  dueDate: z.union([z.string().trim().min(1), z.null()]).optional(),
  links: optionalLinks,
  createdAt: z.union([z.string(), z.null()]).optional(),
})

const updateTicketBodySchema = z.object({
  title: optionalString,
  description: z.union([z.string(), z.null()]).optional(),
  assigneeId: optionalNullableString,
  sqaAssigneeId: optionalNullableString,
  sqaAssignedAt: z.union([z.string(), z.null()]).optional(),
  requestedById: optionalNullableString,
  status: optionalString,
  priority: optionalString,
  type: optionalString,
  dueDate: z.union([z.string().trim().min(1), z.null()]).optional(),
  projectId: optionalNullableString,
  links: optionalLinks,
  departmentId: optionalNullableString,
  epicId: optionalNullableString,
  sprintId: optionalNullableString,
  parentTicketId: optionalNullableString,
  createdAt: z.union([z.string(), z.null()]).optional(),
  assignedAt: z.union([z.string(), z.null()]).optional(),
  startedAt: z.union([z.string(), z.null()]).optional(),
  completedAt: z.union([z.string(), z.null()]).optional(),
  reason: z.unknown().optional(),
})

const statusReasonBodySchema = z.object({
  status: z.enum(["cancelled", "rejected", "returned_to_dev"]),
  reason: z.unknown().optional(),
  reasonCommentBody: z.string().trim().min(1, "Reason comment body is required"),
  startedAt: z.union([z.string(), z.null()]).optional(),
  completedAt: z.union([z.string(), z.null()]).optional(),
  epicId: optionalNullableString,
})

const batchStatusBodySchema = z.object({
  ticketIds: z
    .array(z.string().trim().min(1))
    .min(1, "ticketIds is required")
    .transform((ticketIds) => Array.from(new Set(ticketIds))),
  status: z.string().trim().min(1, "status is required"),
})

const ticketListQuerySchema: z.ZodType<TicketListQuery & { view: "list" }> = z.object({
  view: z.literal("list"),
  projectId: optionalNullableString,
  parentTicketId: optionalNullableString,
  assigneeId: optionalNullableString,
  status: optionalNullableString,
  departmentId: optionalNullableString,
  requestedById: optionalNullableString,
  sprintId: optionalNullableString,
  excludeDone: z.boolean(),
  excludeSubtasks: z.boolean(),
  queryText: optionalNullableString,
  cursor: optionalNullableString,
  page: z.number().int().min(1).nullable().optional(),
  limit: z.number().int().min(1).max(100).nullable(),
  sortBy: z.enum(SORT_COLUMNS).nullable().optional(),
  sortDirection: z.enum(["asc", "desc"]).nullable().optional(),
})

const ticketDetailQuerySchema = z.object({
  view: z.literal("detail"),
})

function normalizeCreateBody(body: Record<string, unknown>) {
  return {
    projectId: readCompatValue(body, "projectId", "project_id"),
    title: readCompatValue(body, "title"),
    description: readCompatValue(body, "description"),
    assigneeId: readCompatValue(body, "assigneeId", "assignee_id"),
    sqaAssigneeId: readCompatValue(body, "sqaAssigneeId", "sqa_assignee_id"),
    sqaAssignedAt: readCompatValue(body, "sqaAssignedAt", "sqa_assigned_at"),
    requestedById: readCompatValue(body, "requestedById", "requested_by_id"),
    priority: readCompatValue(body, "priority"),
    type: readCompatValue(body, "type"),
    status: readCompatValue(body, "status"),
    departmentId: readCompatValue(body, "departmentId", "department_id"),
    epicId: readCompatValue(body, "epicId", "epic_id"),
    sprintId: readCompatValue(body, "sprintId", "sprint_id"),
    parentTicketId: readCompatValue(body, "parentTicketId", "parent_ticket_id"),
    dueDate: readCompatValue(body, "dueDate", "due_date"),
    links: readCompatValue(body, "links"),
    createdAt: readCompatValue(body, "createdAt", "created_at"),
  }
}

function normalizeUpdateBody(body: Record<string, unknown>) {
  return {
    title: readCompatValue(body, "title"),
    description: readCompatValue(body, "description"),
    assigneeId: readCompatValue(body, "assigneeId", "assignee_id"),
    sqaAssigneeId: readCompatValue(body, "sqaAssigneeId", "sqa_assignee_id"),
    sqaAssignedAt: readCompatValue(body, "sqaAssignedAt", "sqa_assigned_at"),
    requestedById: readCompatValue(body, "requestedById", "requested_by_id"),
    status: readCompatValue(body, "status"),
    priority: readCompatValue(body, "priority"),
    type: readCompatValue(body, "type"),
    dueDate: readCompatValue(body, "dueDate", "due_date"),
    projectId: readCompatValue(body, "projectId", "project_id"),
    links: readCompatValue(body, "links"),
    departmentId: readCompatValue(body, "departmentId", "department_id"),
    epicId: readCompatValue(body, "epicId", "epic_id"),
    sprintId: readCompatValue(body, "sprintId", "sprint_id"),
    parentTicketId: readCompatValue(body, "parentTicketId", "parent_ticket_id"),
    createdAt: readCompatValue(body, "createdAt", "created_at"),
    assignedAt: readCompatValue(body, "assignedAt", "assigned_at"),
    startedAt: readCompatValue(body, "startedAt", "started_at"),
    completedAt: readCompatValue(body, "completedAt", "completed_at"),
    reason: readCompatValue(body, "reason"),
  }
}

function normalizeStatusReasonBody(body: Record<string, unknown>) {
  return {
    status: readCompatValue(body, "status"),
    reason: readCompatValue(body, "reason"),
    reasonCommentBody: readCompatValue(body, "reasonCommentBody", "reason_comment_body"),
    startedAt: readCompatValue(body, "startedAt", "started_at"),
    completedAt: readCompatValue(body, "completedAt", "completed_at"),
    epicId: readCompatValue(body, "epicId", "epic_id"),
  }
}

export type CreateTicketInput = z.infer<typeof createTicketBodySchema>
export type UpdateTicketInput = z.infer<typeof updateTicketBodySchema>
export type UpdateTicketStatusWithReasonInput = z.infer<typeof statusReasonBodySchema>
export type BatchUpdateTicketStatusInput = z.infer<typeof batchStatusBodySchema>

export function parseTicketIdParams(input: unknown) {
  return ticketIdParamsSchema.parse(input)
}

export function parseCreateTicketBody(input: unknown) {
  return createTicketBodySchema.parse(normalizeCreateBody(asRecord(input)))
}

export function parseUpdateTicketBody(input: unknown) {
  return updateTicketBodySchema.parse(normalizeUpdateBody(asRecord(input)))
}

export function parseUpdateTicketStatusWithReasonBody(input: unknown) {
  return statusReasonBodySchema.parse(normalizeStatusReasonBody(asRecord(input)))
}

export function parseBatchUpdateTicketStatusBody(input: unknown) {
  return batchStatusBodySchema.parse(asRecord(input))
}

export function parseTicketListRequest(searchParams: URLSearchParams) {
  const parsed = parseTicketListQuery(searchParams)
  const view = searchParams.get("view") || "list"
  return ticketListQuerySchema.parse({
    ...parsed,
    view,
  })
}

export function parseTicketDetailRequest(searchParams: URLSearchParams) {
  return ticketDetailQuerySchema.parse({
    view: searchParams.get("view") || "detail",
  })
}
