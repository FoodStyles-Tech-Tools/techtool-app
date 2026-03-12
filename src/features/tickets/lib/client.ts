import { createQueryString, requestJson } from "@client/lib/api"
import type { SortColumn } from "@shared/ticket-constants"
import type { Ticket, TicketDetailRelations } from "@shared/types"
import {
  normalizeTicket,
  normalizeTicketRelations,
  type RawTicket,
  type RawTicketDetailRelations,
} from "@shared/types/ticket-mappers"
import type { TicketComment } from "@client/hooks/use-ticket-comments"

export type TicketSortDirection = "asc" | "desc"

export type TicketListParams = {
  projectId?: string
  parentTicketId?: string
  assigneeId?: string
  sqaAssigneeId?: string
  status?: string
  priority?: string
  departmentId?: string
  requestedById?: string
  epicId?: string
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

export { normalizeTicket, normalizeTicketRelations }

export function buildTicketListQueryString(params: TicketListParams) {
  return createQueryString({
    view: "list",
    projectId: params.projectId,
    parentTicketId: params.parentTicketId,
    assigneeId: params.assigneeId,
    sqaAssigneeId: params.sqaAssigneeId,
    status: params.status,
    priority: params.priority,
    departmentId: params.departmentId,
    requestedById: params.requestedById,
    epicId: params.epicId,
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
