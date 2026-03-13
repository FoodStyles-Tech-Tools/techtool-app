import { normalizeRichTextInput, isRichTextEmpty } from "@shared/rich-text"
import { prepareLinkPayload } from "@shared/links"
import { buildStatusChangeBody } from "@shared/ticket-statuses"
import { invalidateTicketCaches } from "@server/lib/ticket-cache"
import { HttpError } from "@server/http/http-error"
import * as ticketsRepository from "@server/repositories/tickets-repository"
import {
  notifyBatchTicketStatus,
  notifyTicketForQa,
  notifyTicketReturnedToDev,
} from "@server/lib/discord-ticket-status"
import type {
  BatchUpdateTicketStatusInput,
  CreateTicketInput,
  UpdateTicketInput,
  UpdateTicketStatusWithReasonInput,
} from "@server/validation/tickets"
import type { TicketListQuery } from "@server/lib/tickets-list"

type TicketRequestContext = {
  supabase: Parameters<typeof ticketsRepository.listTickets>[0]
  userId: string
  userRole?: string | null
}

function isSupabaseDataInconsistencyError(message: string | undefined) {
  return Boolean(message?.includes("coerce") || message?.includes("single JSON"))
}

function parseOptionalTimestamp(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "Invalid timestamp value")
  }

  return value
}

async function assertValidParentTicket(
  supabase: TicketRequestContext["supabase"],
  parentTicketId: string
) {
  const { data: parentTicket, error } = await ticketsRepository.findParentTicket(supabase, parentTicketId)

  if (error || !parentTicket) {
    throw new HttpError(400, "Parent ticket not found")
  }

  if (parentTicket.type === "subtask") {
    throw new HttpError(400, "A subtask ticket cannot have child subtasks")
  }
}

function normalizePersistedTicket(ticket: Record<string, unknown>) {
  return ticketsRepository.normalizeTicketRelations(ticket)
}

export function buildTicketListCacheKey(
  userId: string,
  listQuery: TicketListQuery,
  cacheVersion: string | number
) {
  return [
    "v2:tickets",
    cacheVersion,
    userId,
    listQuery.projectId || "all",
    listQuery.parentTicketId || "all",
    listQuery.assigneeId || "all",
    listQuery.sqaAssigneeId || "all",
    listQuery.departmentId || "all",
    listQuery.requestedById || "all",
    listQuery.epicId || "all",
    listQuery.sprintId || "all",
    listQuery.deployRoundId || "all",
    listQuery.status || "all",
    listQuery.priority || "all",
    listQuery.excludeDone ? "exclude_done" : "include_done",
    listQuery.includeStatuses?.length ? listQuery.includeStatuses.join(",") : listQuery.excludeStatuses?.length ? listQuery.excludeStatuses.join(",") : "all",
    listQuery.excludeSubtasks ? "exclude_subtasks" : "include_subtasks",
    listQuery.queryText || "",
    listQuery.cursor || "",
    String(listQuery.page || ""),
    String(listQuery.limit),
    listQuery.sortBy || "default",
    listQuery.sortDirection || "desc",
  ].join(":")
}

export function buildTicketDetailCacheKey(
  userId: string,
  ticketId: string,
  cacheVersion: string | number
) {
  return `v2:ticket:${cacheVersion}:${userId}:${ticketId}`
}

export async function listTickets(context: TicketRequestContext, listQuery: TicketListQuery) {
  const result = await ticketsRepository.listTickets(context.supabase, listQuery)
  return {
    items: result.items,
    data: result.items,
    nextCursor: result.nextCursor,
    ...(result.pageInfo ? { pageInfo: result.pageInfo, pagination: result.pageInfo } : {}),
  }
}

export async function getTicketDetail(context: TicketRequestContext, ticketId: string) {
  const payload = await ticketsRepository.getTicketDetail(context.supabase, ticketId)

  if ("status" in payload && payload.status === 500) {
    throw new HttpError(500, payload.error || "Internal server error")
  }

  if (("status" in payload && payload.status === 404) || !payload.ticket) {
    throw new HttpError(404, payload.error || "Ticket not found")
  }

  return payload
}

export async function createTicket(context: TicketRequestContext, input: CreateTicketInput) {
  if (input.parentTicketId) {
    await assertValidParentTicket(context.supabase, input.parentTicketId)
  }

  const now = new Date().toISOString()
  const assigneeId = input.assigneeId || null
  const sqaAssigneeId = input.sqaAssigneeId || null
  const status = (input.status || "open").trim()

  const { data: ticket, error } = await ticketsRepository.insertTicket(context.supabase, {
    project_id: input.projectId || null,
    title: input.title,
    description: normalizeRichTextInput(input.description),
    assignee_id: assigneeId,
    sqa_assignee_id: sqaAssigneeId,
    sqa_assigned_at: input.sqaAssignedAt ?? (sqaAssigneeId ? now : null),
    assigned_at: assigneeId ? now : null,
    started_at: status === "in_progress" || status === "cancelled" || status === "completed" ? now : null,
    completed_at: status === "cancelled" || status === "completed" ? now : null,
    due_date: input.dueDate || null,
    links: prepareLinkPayload(Array.isArray(input.links) ? input.links : []),
    ...(input.createdAt ? { created_at: input.createdAt } : {}),
    requested_by_id: input.requestedById || context.userId,
    priority: (input.priority || "medium").trim(),
    type: (input.type || "task").trim(),
    status,
    activity_actor_id: context.userId,
    department_id: input.departmentId || null,
    epic_id: input.epicId || null,
    deploy_round_id: input.deployRoundId || null,
    sprint_id: input.sprintId || null,
    parent_ticket_id: input.parentTicketId || null,
  })

  if (error) {
    console.error("Error creating ticket:", error)
    if (isSupabaseDataInconsistencyError(error.message)) {
      throw new HttpError(500, "Ticket creation data inconsistency detected")
    }
    throw new HttpError(500, "Failed to create ticket")
  }

  await invalidateTicketCaches()

  return {
    ticket: normalizePersistedTicket(ticket as Record<string, unknown>),
  }
}

export async function updateTicket(
  context: TicketRequestContext,
  ticketId: string,
  input: UpdateTicketInput,
  rawBody: Record<string, unknown>
) {
  const hasField = (camelKey: string, snakeKey?: string) =>
    Object.prototype.hasOwnProperty.call(rawBody, camelKey) ||
    (snakeKey ? Object.prototype.hasOwnProperty.call(rawBody, snakeKey) : false)

  const [
    { data: currentTicket, error: fetchError },
    { data: currentUser, error: userError },
  ] = await Promise.all([
    ticketsRepository.findTicketForUpdate(context.supabase, ticketId),
    ticketsRepository.findUserRoleById(context.supabase, context.userId),
  ])

  if (fetchError) {
    console.error("Error fetching current ticket:", fetchError)
    throw new HttpError(500, "Failed to fetch ticket")
  }

  if (!currentTicket) {
    throw new HttpError(404, "Ticket not found")
  }

  if (userError) {
    console.error("Error fetching current user role:", userError)
    throw new HttpError(500, "Failed to validate user role")
  }

  const isSqaUser = (currentUser?.role || "").toLowerCase() === "sqa"
  if (isSqaUser) {
    const currentSqaAssigneeId = currentTicket.sqa_assignee_id || null
    const requestedSqaAssigneeId = !hasField("sqaAssigneeId", "sqa_assignee_id")
      ? undefined
      : input.sqaAssigneeId || null
    const sqaAllowedFields = new Set([
      "sqa_assignee_id",
      "sqa_assigned_at",
      "sqaAssigneeId",
      "sqaAssignedAt",
      "deploy_round_id",
      "deployRoundId",
    ])
    const touchedNonSqaAllowedField = Object.keys(rawBody).some(
      (field) => !sqaAllowedFields.has(field)
    )
    const isSelfAssignOnlyRequest =
      hasField("sqaAssigneeId", "sqa_assignee_id") &&
      requestedSqaAssigneeId === context.userId &&
      !touchedNonSqaAllowedField
    const isDeployRoundOnlyRequest =
      hasField("deployRoundId", "deploy_round_id") && !touchedNonSqaAllowedField

    if (currentSqaAssigneeId !== context.userId && !isSelfAssignOnlyRequest && !isDeployRoundOnlyRequest) {
      throw new HttpError(
        403,
        "SQA users can only edit tickets assigned to them. Assign yourself as SQA first."
      )
    }
  }

  if (hasField("parentTicketId", "parent_ticket_id")) {
    if (input.parentTicketId && input.parentTicketId === ticketId) {
      throw new HttpError(400, "A ticket cannot be its own parent")
    }

    if (input.parentTicketId) {
      await assertValidParentTicket(context.supabase, input.parentTicketId)
    }
  }

  const updates: Record<string, unknown> = {
    activity_actor_id: context.userId,
  }

  if (input.title !== undefined) updates.title = input.title
  if (input.description !== undefined) updates.description = normalizeRichTextInput(input.description)

  if (hasField("assigneeId", "assignee_id")) {
    const previousAssigneeId = currentTicket.assignee_id || null
    updates.assignee_id = input.assigneeId || null

    if (!input.assigneeId) {
      updates.assigned_at = null
    } else if (!hasField("assignedAt", "assigned_at")) {
      if (!previousAssigneeId || previousAssigneeId !== input.assigneeId) {
        updates.assigned_at = new Date().toISOString()
      }
    }
  }

  if (hasField("sqaAssigneeId", "sqa_assignee_id")) {
    const previousSqaAssigneeId = currentTicket.sqa_assignee_id || null
    updates.sqa_assignee_id = input.sqaAssigneeId || null

    if (!input.sqaAssigneeId) {
      updates.sqa_assigned_at = null
    } else if (!hasField("sqaAssignedAt", "sqa_assigned_at")) {
      if (!previousSqaAssigneeId || previousSqaAssigneeId !== input.sqaAssigneeId) {
        updates.sqa_assigned_at = new Date().toISOString()
      }
    }
  }

  if (hasField("requestedById", "requested_by_id")) updates.requested_by_id = input.requestedById || null

  if (hasField("status")) {
    const previousStatus = currentTicket.status || null
    const nextStatus = input.status || null
    updates.status = nextStatus

    if ((previousStatus === "open" || previousStatus === "blocked") && nextStatus !== "open" && nextStatus !== "blocked") {
      if (!hasField("startedAt", "started_at")) {
        updates.started_at = new Date().toISOString()
      }
    }

    if (nextStatus === "completed" || nextStatus === "cancelled" || nextStatus === "rejected") {
      if (!hasField("completedAt", "completed_at")) {
        updates.completed_at = new Date().toISOString()
      }

      if (!hasField("startedAt", "started_at") && !currentTicket.started_at) {
        updates.started_at = new Date().toISOString()
      }
    }

    if (
      (previousStatus === "completed" || previousStatus === "cancelled" || previousStatus === "rejected") &&
      nextStatus !== "completed" &&
      nextStatus !== "cancelled" &&
      nextStatus !== "rejected"
    ) {
      updates.completed_at = null
      updates.reason = null
    }

    if (previousStatus === "in_progress" && (nextStatus === "blocked" || nextStatus === "open")) {
      updates.started_at = null
    }

    if (nextStatus === "open") {
      updates.started_at = null
      updates.completed_at = null
    }

    if ((nextStatus === "in_progress" || nextStatus === "blocked") && previousStatus !== "open" && previousStatus !== "blocked") {
      if (!hasField("startedAt", "started_at") && !currentTicket.started_at) {
        updates.started_at = new Date().toISOString()
      }
      updates.completed_at = null
    }
  }

  if (hasField("priority")) updates.priority = input.priority
  if (hasField("type")) updates.type = input.type
  if (hasField("dueDate", "due_date")) updates.due_date = input.dueDate || null
  if (hasField("projectId", "project_id")) updates.project_id = input.projectId || null
  if (hasField("links")) updates.links = prepareLinkPayload(Array.isArray(input.links) ? input.links : [])
  if (hasField("departmentId", "department_id")) updates.department_id = input.departmentId || null
  if (hasField("epicId", "epic_id")) updates.epic_id = input.epicId || null
  if (hasField("sprintId", "sprint_id")) updates.sprint_id = input.sprintId || null
  if (hasField("deployRoundId", "deploy_round_id")) updates.deploy_round_id = input.deployRoundId || null
  if (hasField("parentTicketId", "parent_ticket_id")) updates.parent_ticket_id = input.parentTicketId || null
  if (hasField("reason")) updates.reason = input.reason
  if (hasField("sqaAssignedAt", "sqa_assigned_at")) updates.sqa_assigned_at = input.sqaAssignedAt || null

  if (hasField("createdAt", "created_at")) {
    updates.created_at = parseOptionalTimestamp(input.createdAt)
  }
  if (hasField("assignedAt", "assigned_at")) {
    updates.assigned_at = parseOptionalTimestamp(input.assignedAt)
  }
  if (hasField("startedAt", "started_at")) {
    updates.started_at = parseOptionalTimestamp(input.startedAt)
  }
  if (hasField("completedAt", "completed_at")) {
    updates.completed_at = parseOptionalTimestamp(input.completedAt)
  }

  const { data: ticket, error } = await ticketsRepository.updateTicket(context.supabase, ticketId, updates)

  if (error) {
    console.error("Error updating ticket:", error)
    if (isSupabaseDataInconsistencyError(error.message)) {
      throw new HttpError(500, "Ticket data inconsistency detected")
    }
    throw new HttpError(500, error.message || "Failed to update ticket")
  }

  if (!ticket) {
    throw new HttpError(404, "Ticket not found")
  }

  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    const previousStatus = (currentTicket.status as string | null) || null
    const nextStatus = (updates.status as string | null) || null

    if (nextStatus && previousStatus !== nextStatus) {
      const normalizedTicket = normalizePersistedTicket(ticket as Record<string, unknown>)
      void notifyTicketForQa(context.supabase, normalizedTicket as any, previousStatus)
      void notifyTicketReturnedToDev(context.supabase, normalizedTicket as any, previousStatus)
    }
  }

  await invalidateTicketCaches()

  return {
    ticket: normalizePersistedTicket(ticket as Record<string, unknown>),
  }
}

export async function updateTicketStatusWithReason(
  context: TicketRequestContext,
  ticketId: string,
  input: UpdateTicketStatusWithReasonInput
) {
  if (
    (input.status === "cancelled" || input.status === "rejected" || input.status === "archived") &&
    (!input.reason || typeof input.reason !== "object" || Array.isArray(input.reason))
  ) {
    throw new HttpError(400, "reason object is required")
  }

  if (isRichTextEmpty(input.reasonCommentBody)) {
    throw new HttpError(400, "Reason comment body is required")
  }

  const { data: currentTicket, error: ticketError } = await ticketsRepository.findTicketForStatusReason(
    context.supabase,
    ticketId
  )

  if (ticketError) {
    console.error("Error fetching current ticket:", ticketError)
    throw new HttpError(500, "Failed to fetch ticket")
  }

  if (!currentTicket) {
    throw new HttpError(404, "Ticket not found")
  }

  if ((context.userRole || "").toLowerCase() === "sqa" && currentTicket.sqa_assignee_id !== context.userId) {
    throw new HttpError(
      403,
      "SQA users can only edit tickets assigned to them. Assign yourself as SQA first."
    )
  }

  const now = new Date().toISOString()
  const previousStatus = (currentTicket.status as string | null) || null

  // Derive startedAt server-side when the client does not supply it.
  // For cancelled / rejected: ensure started_at is recorded if the ticket never started.
  const clientSetStartedAt = input.startedAt !== undefined
  let finalStartedAt: string | null = clientSetStartedAt ? parseOptionalTimestamp(input.startedAt) : null
  let setStartedAt = clientSetStartedAt
  if (!clientSetStartedAt && (input.status === "cancelled" || input.status === "rejected")) {
    if (!currentTicket.started_at) {
      finalStartedAt = now
      setStartedAt = true
    }
  }

  // Derive completedAt server-side when the client does not supply it.
  // For cancelled / rejected / archived: always mark as completed now.
  // For returned_to_dev:                  clear completed_at if the ticket was previously in a done state.
  const clientSetCompletedAt = input.completedAt !== undefined
  let finalCompletedAt: string | null = clientSetCompletedAt ? parseOptionalTimestamp(input.completedAt) : null
  let setCompletedAt = clientSetCompletedAt
  if (!clientSetCompletedAt) {
    if (input.status === "cancelled" || input.status === "rejected" || input.status === "archived") {
      finalCompletedAt = now
      setCompletedAt = true
    } else if (
      input.status === "returned_to_dev" &&
      (previousStatus === "completed" || previousStatus === "cancelled" || previousStatus === "rejected")
    ) {
      finalCompletedAt = null
      setCompletedAt = true
    }
  }

  const { error: rpcError } = await ticketsRepository.runUpdateTicketStatusWithReasonCommentRpc(
    context.supabase,
    {
      p_ticket_id: ticketId,
      p_actor_id: context.userId,
      p_status: input.status,
      p_reason: input.reason ?? null,
      p_set_reason: input.reason !== undefined,
      p_reason_comment_body: input.reasonCommentBody,
      p_started_at: finalStartedAt,
      p_set_started_at: setStartedAt,
      p_completed_at: finalCompletedAt,
      p_set_completed_at: setCompletedAt,
      p_epic_id: input.epicId ?? null,
      p_set_epic_id: input.epicId !== undefined,
    }
  )

  if (rpcError) {
    if (rpcError.details === "ticket_not_found") {
      throw new HttpError(404, "Ticket not found")
    }

    console.error("Error in update_ticket_status_with_reason_comment RPC:", rpcError)
    throw new HttpError(500, rpcError.message || "Failed to update ticket")
  }

  const { data: updatedTicket, error } = await ticketsRepository.getTicketByIdWithRelations(
    context.supabase,
    ticketId
  )

  if (error || !updatedTicket) {
    console.error("Error fetching updated ticket:", error)
    throw new HttpError(500, "Failed to fetch updated ticket")
  }

  const normalizedTicket = normalizePersistedTicket(updatedTicket as Record<string, unknown>)
  void notifyTicketForQa(context.supabase, normalizedTicket as any, previousStatus)
  void notifyTicketReturnedToDev(context.supabase, normalizedTicket as any, previousStatus)
  await invalidateTicketCaches()

  return {
    ticket: normalizedTicket,
  }
}

export async function batchUpdateTicketStatus(
  context: TicketRequestContext,
  input: BatchUpdateTicketStatusInput
) {
  const { data: currentTickets, error: fetchError } = await ticketsRepository.findTicketsForBatchStatus(
    context.supabase,
    input.ticketIds
  )

  if (fetchError) {
    console.error("Error fetching tickets for batch status update:", fetchError)
    throw new HttpError(500, "Failed to load tickets")
  }

  if (!currentTickets?.length) {
    throw new HttpError(404, "Tickets not found")
  }

  const results = await Promise.all(
    currentTickets.map((ticket) =>
      ticketsRepository.updateTicketStatusBatch(context.supabase, ticket.id, {
        status: input.status,
        ...buildStatusChangeBody(ticket.status || "open", input.status, {
          startedAt: ticket.started_at ?? null,
        }),
        activity_actor_id: context.userId,
      })
    )
  )

  const failedUpdate = results.find((result) => result.error)
  if (failedUpdate?.error) {
    console.error("Error updating tickets in batch status route:", failedUpdate.error)
    throw new HttpError(500, "Failed to update tickets")
  }

  await invalidateTicketCaches()

  if (input.status === "for_qa" || input.status === "returned_to_dev") {
    const status = input.status
    const updatedTicketsForStatus = currentTickets.map((ticket) => ({
      ...ticket,
      status,
    })) as any[]

    void notifyBatchTicketStatus(status, updatedTicketsForStatus as any)
  }

  return {
    updatedCount: currentTickets.length,
    ticketIds: currentTickets.map((ticket) => ticket.id),
  }
}
