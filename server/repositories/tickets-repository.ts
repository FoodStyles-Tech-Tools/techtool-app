import type { TicketListQuery } from "@server/lib/tickets-list"
import { fetchTicketDetailPayload } from "@server/lib/ticket-detail"
import { fetchTicketList } from "@server/lib/tickets-list"
import { createServerClient } from "@server/lib/supabase"

type SupabaseClientLike = Awaited<ReturnType<typeof createServerClient>>

const TICKET_SELECT = `
  *,
  project:projects(id, name, require_sqa),
  assignee:users!tickets_assignee_id_fkey(id, name, email, role, discord_id, avatar_url),
  sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email, role, discord_id, avatar_url),
  requested_by:users!tickets_requested_by_id_fkey(id, name, email, avatar_url),
  department:departments(id, name),
  epic:epics(id, name, color),
  sprint:sprints(id, name),
  deploy_round:deploy_rounds(id, name)
`

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeUser<T extends { avatar_url?: string | null }>(value: T | T[] | null | undefined) {
  const normalized = normalizeRelation(value)
  if (!normalized) return null

  return {
    ...normalized,
    image: normalized.avatar_url || null,
  }
}

export function normalizeTicketRelations<T extends Record<string, unknown>>(ticket: T) {
  const assignee = ticket.assignee as { avatar_url?: string | null } | { avatar_url?: string | null }[] | null | undefined
  const sqaAssignee = ticket.sqa_assignee as
    | { avatar_url?: string | null }
    | { avatar_url?: string | null }[]
    | null
    | undefined
  const requestedBy = ticket.requested_by as
    | { avatar_url?: string | null }
    | { avatar_url?: string | null }[]
    | null
    | undefined

  return {
    ...ticket,
    project: normalizeRelation(ticket.project),
    assignee: normalizeUser(assignee),
    sqa_assignee: normalizeUser(sqaAssignee),
    requested_by: normalizeUser(requestedBy),
    department: normalizeRelation(ticket.department),
    epic: normalizeRelation(ticket.epic),
    sprint: normalizeRelation(ticket.sprint),
  }
}

export function listTickets(supabase: SupabaseClientLike, query: TicketListQuery) {
  return fetchTicketList(supabase, query)
}

export function getTicketDetail(supabase: SupabaseClientLike, ticketId: string) {
  return fetchTicketDetailPayload(supabase, ticketId)
}

export function findParentTicket(supabase: SupabaseClientLike, ticketId: string) {
  return supabase
    .from("tickets")
    .select("id, type")
    .eq("id", ticketId)
    .maybeSingle()
}

export function findTicketForUpdate(supabase: SupabaseClientLike, ticketId: string) {
  return supabase
    .from("tickets")
    .select("assignee_id, sqa_assignee_id, assigned_at, sqa_assigned_at, status, started_at, completed_at, created_at, project_id")
    .eq("id", ticketId)
    .maybeSingle()
}

export function findUserRoleById(supabase: SupabaseClientLike, userId: string) {
  return supabase.from("users").select("role").eq("id", userId).maybeSingle()
}

export function findTicketForStatusReason(supabase: SupabaseClientLike, ticketId: string) {
  return supabase
    .from("tickets")
    .select("id, status, sqa_assignee_id, started_at, project_id")
    .eq("id", ticketId)
    .maybeSingle()
}

export function findTicketStatusConfig(supabase: SupabaseClientLike, statusKey: string) {
  return supabase
    .from("ticket_statuses")
    .select("key, sqa_flow")
    .eq("key", statusKey)
    .maybeSingle()
}

export function findProjectSqaRequirementById(supabase: SupabaseClientLike, projectId: string) {
  return supabase
    .from("projects")
    .select("id, require_sqa")
    .eq("id", projectId)
    .maybeSingle()
}

export function findProjectsSqaRequirementsByIds(supabase: SupabaseClientLike, projectIds: string[]) {
  return supabase
    .from("projects")
    .select("id, require_sqa")
    .in("id", projectIds)
}

export function insertTicket(
  supabase: SupabaseClientLike,
  payload: Record<string, unknown>
) {
  return supabase.from("tickets").insert(payload).select(TICKET_SELECT).single()
}

export function updateTicket(
  supabase: SupabaseClientLike,
  ticketId: string,
  updates: Record<string, unknown>
) {
  return supabase.from("tickets").update(updates).eq("id", ticketId).select(TICKET_SELECT).single()
}

export function runUpdateTicketStatusWithReasonCommentRpc(
  supabase: SupabaseClientLike,
  payload: Record<string, unknown>
) {
  return supabase.rpc("update_ticket_status_with_reason_comment", payload)
}

export function getTicketByIdWithRelations(supabase: SupabaseClientLike, ticketId: string) {
  return supabase.from("tickets").select(TICKET_SELECT).eq("id", ticketId).single()
}

export function findTicketsForBatchStatus(supabase: SupabaseClientLike, ticketIds: string[]) {
  return supabase.from("tickets").select("id, status, started_at, project_id").in("id", ticketIds)
}

export function updateTicketStatusBatch(
  supabase: SupabaseClientLike,
  ticketId: string,
  updates: Record<string, unknown>
) {
  return supabase.from("tickets").update(updates).eq("id", ticketId)
}
