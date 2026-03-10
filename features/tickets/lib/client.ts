import { createQueryString, requestJson } from "@/lib/client/api"
import { sanitizeLinkArray } from "@/lib/links"
import type { SortColumn } from "@/lib/ticket-constants"
import type { Ticket, TicketDetailRelations } from "@/lib/types"
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

export function normalizeTicket(ticket: Ticket): Ticket {
  return {
    ...ticket,
    links: sanitizeLinkArray(ticket.links),
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
  }
}

