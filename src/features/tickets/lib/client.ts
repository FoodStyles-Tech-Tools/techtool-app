import { createQueryString, requestJson } from "@lib/client/api"
import { sanitizeLinkArray } from "@lib/links"
import type { SortColumn } from "@lib/ticket-constants"
import type { MentionedTicketRelation, RelatedTicket, Ticket, TicketDetailRelations } from "@lib/types"
import type { TicketComment } from "@client/hooks/use-ticket-comments"

type RawRelatedTicket = {
  id: string
  display_id?: string | null
  displayId?: string | null
  title: string
  status: string
  type: string | null
}

type RawMentionedTicketRelation = {
  ticket: RawRelatedTicket
  mentionedInCommentIds?: string[]
  comment_ids?: string[]
}

type RawTicketDetailRelations = {
  parent: RawRelatedTicket | null
  subtasks: RawRelatedTicket[]
  mentioned_in_comments?: RawMentionedTicketRelation[]
  mentionedInComments?: RawMentionedTicketRelation[]
}

type RawTicket = {
  id: string
  display_id?: string | null
  displayId?: string | null
  parent_ticket_id?: string | null
  parentTicketId?: string | null
  title: string
  description: string | null
  status: string
  priority: string
  type: string
  due_date?: string | null
  dueDate?: string | null
  sqa_assigned_at?: string | null
  sqaAssignedAt?: string | null
  links: string[]
  reason?: Ticket["reason"]
  department: Ticket["department"]
  epic: Ticket["epic"]
  sprint: Ticket["sprint"]
  project: Ticket["project"]
  assignee: Ticket["assignee"]
  sqa_assignee?: Ticket["sqaAssignee"]
  sqaAssignee?: Ticket["sqaAssignee"]
  requested_by?: Ticket["requestedBy"]
  requestedBy?: Ticket["requestedBy"]
  created_at?: string
  createdAt?: string
  started_at?: string | null
  startedAt?: string | null
  completed_at?: string | null
  completedAt?: string | null
  assigned_at?: string | null
  assignedAt?: string | null
}

export type TicketSortDirection = "asc" | "desc"

export type TicketListParams = {
  projectId?: string
  parentTicketId?: string
  assigneeId?: string
  status?: string
  departmentId?: string
  requestedById?: string
  sprintId?: string
  excludeDone?: boolean
  excludeSubtasks?: boolean
  q?: string
  limit?: number
  page?: number
  sortBy?: SortColumn
  sortDirection?: TicketSortDirection
}

type RawTicketsResponse = {
  items?: RawTicket[]
  tickets?: RawTicket[]
  data?: RawTicket[]
  pageInfo?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  nextCursor?: string | null
}

export type TicketResponse = {
  ticket: RawTicket
}

type RawTicketDetailResponse = {
  ticket: RawTicket
  comments: TicketComment[]
  relations?: RawTicketDetailRelations
}

export type TicketsResponse = {
  items?: Ticket[]
  data?: Ticket[]
  pageInfo?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  nextCursor?: string | null
}

export type TicketDetailResponse = {
  ticket: Ticket
  comments: TicketComment[]
  relations?: TicketDetailRelations
}

function normalizeRelatedTicket(ticket: RawRelatedTicket): RelatedTicket {
  return {
    id: ticket.id,
    displayId: ticket.displayId ?? ticket.display_id ?? null,
    title: ticket.title,
    status: ticket.status,
    type: ticket.type,
  }
}

function normalizeMentionedTicketRelation(relation: RawMentionedTicketRelation): MentionedTicketRelation {
  return {
    ticket: normalizeRelatedTicket(relation.ticket),
    mentionedInCommentIds: relation.mentionedInCommentIds ?? relation.comment_ids ?? [],
  }
}

export function normalizeTicket(ticket: RawTicket): Ticket {
  return {
    displayId: ticket.displayId ?? ticket.display_id ?? null,
    parentTicketId: ticket.parentTicketId ?? ticket.parent_ticket_id ?? null,
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    type: ticket.type,
    dueDate: ticket.dueDate ?? ticket.due_date ?? null,
    sqaAssignedAt: ticket.sqaAssignedAt ?? ticket.sqa_assigned_at ?? null,
    requestedBy: (ticket.requestedBy ?? ticket.requested_by)!,
    sqaAssignee: ticket.sqaAssignee ?? ticket.sqa_assignee ?? null,
    createdAt: (ticket.createdAt ?? ticket.created_at)!,
    startedAt: ticket.startedAt ?? ticket.started_at ?? null,
    completedAt: ticket.completedAt ?? ticket.completed_at ?? null,
    assignedAt: ticket.assignedAt ?? ticket.assigned_at ?? null,
    links: sanitizeLinkArray(ticket.links),
    reason: ticket.reason ?? null,
    department: ticket.department,
    epic: ticket.epic,
    sprint: ticket.sprint,
    project: ticket.project,
    assignee: ticket.assignee,
  }
}

export function normalizeTicketRelations(relations?: RawTicketDetailRelations): TicketDetailRelations | undefined {
  if (!relations) return relations

  const mentionedInComments = (relations.mentionedInComments ?? relations.mentioned_in_comments ?? []).map(
    normalizeMentionedTicketRelation
  )

  return {
    parent: relations.parent ? normalizeRelatedTicket(relations.parent) : null,
    subtasks: relations.subtasks.map(normalizeRelatedTicket),
    mentionedInComments,
  }
}

export function buildTicketListQueryString(params: TicketListParams) {
  return createQueryString({
    view: "list",
    projectId: params.projectId,
    parentTicketId: params.parentTicketId,
    assigneeId: params.assigneeId,
    status: params.status,
    departmentId: params.departmentId,
    requestedById: params.requestedById,
    sprintId: params.sprintId,
    excludeDone: params.excludeDone,
    excludeSubtasks: params.excludeSubtasks,
    q: params.q,
    limit: params.limit,
    page: params.page,
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  })
}

export async function fetchTicketList(params: TicketListParams) {
  const response = await requestJson<RawTicketsResponse>(`/api/v2/tickets${buildTicketListQueryString(params)}`)
  const items = (response.items || response.data || response.tickets || []).map(normalizeTicket)
  const pageInfo = response.pageInfo || response.pagination

  return {
    items,
    data: items,
    ...(pageInfo ? { pageInfo } : {}),
    ...(response.nextCursor !== undefined ? { nextCursor: response.nextCursor } : {}),
  }
}

export async function fetchTicketDetail(ticketId: string) {
  const response = await requestJson<RawTicketDetailResponse>(`/api/v2/tickets/${ticketId}?view=detail`)
  return {
    ...response,
    ticket: normalizeTicket(response.ticket),
    relations: normalizeTicketRelations(response.relations),
  }
}
