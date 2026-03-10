import { createQueryString, requestJson } from "@/lib/client/api"
import { sanitizeLinkArray } from "@/lib/links"
import type { SortColumn } from "@/lib/ticket-constants"
import type { MentionedTicketRelation, RelatedTicket, Ticket, TicketDetailRelations } from "@/lib/types"
import type { TicketComment } from "@/hooks/use-ticket-comments"

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

export type TicketsResponse = {
  items?: Ticket[]
  tickets?: Ticket[]
  data?: Ticket[]
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
  ticket: Ticket
}

export type TicketDetailResponse = {
  ticket: Ticket
  comments: TicketComment[]
  relations?: TicketDetailRelations
}

function normalizeRelatedTicket(ticket: RelatedTicket): RelatedTicket {
  return {
    ...ticket,
    displayId: ticket.displayId ?? ticket.display_id ?? null,
  }
}

function normalizeMentionedTicketRelation(relation: MentionedTicketRelation): MentionedTicketRelation {
  return {
    ...relation,
    ticket: normalizeRelatedTicket(relation.ticket),
    mentionedInCommentIds: relation.mentionedInCommentIds ?? relation.comment_ids,
  }
}

export function normalizeTicket(ticket: Ticket): Ticket {
  return {
    ...ticket,
    displayId: ticket.displayId ?? ticket.display_id ?? null,
    parentTicketId: ticket.parentTicketId ?? ticket.parent_ticket_id ?? null,
    dueDate: ticket.dueDate ?? ticket.due_date ?? null,
    sqaAssignedAt: ticket.sqaAssignedAt ?? ticket.sqa_assigned_at ?? null,
    requestedBy: ticket.requestedBy ?? ticket.requested_by,
    sqaAssignee: ticket.sqaAssignee ?? ticket.sqa_assignee ?? null,
    createdAt: ticket.createdAt ?? ticket.created_at,
    startedAt: ticket.startedAt ?? ticket.started_at ?? null,
    completedAt: ticket.completedAt ?? ticket.completed_at ?? null,
    assignedAt: ticket.assignedAt ?? ticket.assigned_at ?? null,
    links: sanitizeLinkArray(ticket.links),
  }
}

export function normalizeTicketRelations(relations?: TicketDetailRelations): TicketDetailRelations | undefined {
  if (!relations) return relations

  return {
    parent: relations.parent ? normalizeRelatedTicket(relations.parent) : null,
    subtasks: relations.subtasks.map(normalizeRelatedTicket),
    mentioned_in_comments: relations.mentioned_in_comments.map(normalizeMentionedTicketRelation),
    mentionedInComments: relations.mentioned_in_comments.map(normalizeMentionedTicketRelation),
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
  const response = await requestJson<TicketsResponse>(`/api/v2/tickets${buildTicketListQueryString(params)}`)
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
  const response = await requestJson<TicketDetailResponse>(`/api/v2/tickets/${ticketId}?view=detail`)
  return {
    ...response,
    ticket: normalizeTicket(response.ticket),
    relations: normalizeTicketRelations(response.relations),
  }
}
