import { sanitizeLinkArray } from "@shared/links"
import type { SortColumn } from "@shared/ticket-constants"
import type { TicketListItem, TicketPerson } from "@shared/types/api/tickets"

type SupabaseLike = any

type TicketListCursor = {
  createdAt: string
  id: string | null
}

export type TicketListPageInfo = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type TicketListQuery = {
  projectId?: string | null
  parentTicketId?: string | null
  assigneeId?: string | null
  sqaAssigneeId?: string | null
  status?: string | null
  priority?: string | null
  departmentId?: string | null
  requestedById?: string | null
  epicId?: string | null
  sprintId?: string | null
  excludeDone: boolean
  excludeSubtasks: boolean
  queryText?: string | null
  cursor?: string | null
  page?: number | null
  limit: number | null
  sortBy?: SortColumn | null
  sortDirection?: "asc" | "desc" | null
}

export type TicketListResult = {
  items: TicketListItem[]
  nextCursor: string | null
  pageInfo?: TicketListPageInfo
}

function firstNonEmpty(searchParams: URLSearchParams, keys: string[]): string | null {
  for (const key of keys) {
    const value = searchParams.get(key)
    if (value !== null && value !== "") return value
  }
  return null
}

function parseBoolean(searchParams: URLSearchParams, keys: string[]): boolean {
  const value = firstNonEmpty(searchParams, keys)
  return value === "true"
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.floor(parsed))
}

function parseCursor(rawCursor: string | null | undefined): TicketListCursor | null {
  if (!rawCursor) return null
  if (!rawCursor.includes("|")) {
    return { createdAt: rawCursor, id: null }
  }
  const [createdAt, id] = rawCursor.split("|")
  if (!createdAt) return null
  return {
    createdAt,
    id: id || null,
  }
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeUser(
  value: any
): { id: string; name: string | null; email: string; avatar_url?: string | null } | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

function toTicketPerson(
  user: { id: string; name: string | null; email: string; avatar_url?: string | null } | null
): TicketPerson | null {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.avatar_url || null,
  }
}

export function parseTicketListQuery(searchParams: URLSearchParams): TicketListQuery {
  const rawLimit = firstNonEmpty(searchParams, ["limit"])
  const rawSortDirection = firstNonEmpty(searchParams, ["sortDirection", "sort_direction"])
  const rawSortBy = firstNonEmpty(searchParams, ["sortBy", "sort_by"]) as SortColumn | null

  return {
    projectId: firstNonEmpty(searchParams, ["projectId", "project_id"]),
    parentTicketId: firstNonEmpty(searchParams, ["parentTicketId", "parent_ticket_id"]),
    assigneeId: firstNonEmpty(searchParams, ["assigneeId", "assignee_id"]),
    sqaAssigneeId: firstNonEmpty(searchParams, ["sqaAssigneeId", "sqa_assignee_id"]),
    status: firstNonEmpty(searchParams, ["status"]),
    priority: firstNonEmpty(searchParams, ["priority"]),
    departmentId: firstNonEmpty(searchParams, ["departmentId", "department_id"]),
    requestedById: firstNonEmpty(searchParams, ["requestedById", "requested_by_id"]),
    epicId: firstNonEmpty(searchParams, ["epicId", "epic_id"]),
    sprintId: firstNonEmpty(searchParams, ["sprintId", "sprint_id"]),
    excludeDone: parseBoolean(searchParams, ["excludeDone", "exclude_done"]),
    excludeSubtasks: parseBoolean(searchParams, ["excludeSubtasks", "exclude_subtasks"]),
    queryText: firstNonEmpty(searchParams, ["q"]),
    cursor: firstNonEmpty(searchParams, ["cursor"]),
    page: (() => {
      const pageValue = firstNonEmpty(searchParams, ["page"])
      if (!pageValue) return null
      return parsePositiveInt(pageValue, 1)
    })(),
    limit: rawLimit ? Math.min(parsePositiveInt(rawLimit, 50), 100) : null,
    sortBy: rawSortBy,
    sortDirection:
      rawSortDirection === "asc" || rawSortDirection === "desc" ? rawSortDirection : null,
  }
}

function applyTicketOrdering(query: any, sortBy?: SortColumn | null, sortDirection?: "asc" | "desc" | null) {
  const ascending = sortDirection === "asc"

  switch (sortBy) {
    case "id":
      return query.order("display_id", { ascending }).order("id", { ascending })
    case "title":
      return query.order("title", { ascending }).order("id", { ascending: false })
    case "due_date":
      return query.order("due_date", { ascending, nullsFirst: false }).order("id", { ascending: false })
    case "type":
      return query.order("type", { ascending }).order("id", { ascending: false })
    case "status":
      return query.order("status", { ascending }).order("id", { ascending: false })
    case "priority":
      return query.order("priority", { ascending }).order("id", { ascending: false })
    case "sqa_assigned_at":
      return query.order("sqa_assigned_at", { ascending, nullsFirst: false }).order("id", { ascending: false })
    default:
      return query.order("created_at", { ascending: false }).order("id", { ascending: false })
  }
}

export async function fetchTicketList(
  supabase: SupabaseLike,
  query: TicketListQuery
): Promise<TicketListResult> {
  const limit = query.limit ? Math.min(Math.max(query.limit, 1), 100) : null
  const useUnboundedMode = !limit
  const hasCursor = Boolean(query.cursor)
  const hasPage = Boolean(query.page && query.page > 0 && limit)
  const usePageMode = hasPage && !hasCursor
  const page = usePageMode ? (query.page as number) : 1
  const offset = usePageMode && limit ? (page - 1) * limit : 0

  let ticketsQuery = supabase
    .from("tickets")
    .select(
      `
      id,
      display_id,
      parent_ticket_id,
      title,
      due_date,
      status,
      priority,
      type,
      links,
      reason,
      assigned_at,
      sqa_assigned_at,
      started_at,
      completed_at,
      created_at,
      updated_at,
      project:projects(id, name, require_sqa),
      assignee:users!tickets_assignee_id_fkey(id, name, email, avatar_url),
      sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email, avatar_url),
      requested_by:users!tickets_requested_by_id_fkey(id, name, email, avatar_url),
      department:departments(id, name),
      epic:epics(id, name, color),
      sprint:sprints(id, name, status)
    `,
      usePageMode ? { count: "exact" } : undefined
    )

  if (query.projectId) {
    ticketsQuery = ticketsQuery.eq("project_id", query.projectId)
  }
  if (query.parentTicketId) {
    ticketsQuery = ticketsQuery.eq("parent_ticket_id", query.parentTicketId)
  }
  if (query.assigneeId) {
    if (query.assigneeId === "unassigned") {
      ticketsQuery = ticketsQuery.is("assignee_id", null)
    } else {
      ticketsQuery = ticketsQuery.eq("assignee_id", query.assigneeId)
    }
  }
  if (query.sqaAssigneeId) {
    if (query.sqaAssigneeId === "unassigned") {
      ticketsQuery = ticketsQuery.is("sqa_assignee_id", null)
    } else {
      ticketsQuery = ticketsQuery.eq("sqa_assignee_id", query.sqaAssigneeId)
    }
  }
  if (query.status) {
    ticketsQuery = ticketsQuery.eq("status", query.status)
  }
  if (query.priority) {
    ticketsQuery = ticketsQuery.eq("priority", query.priority)
  }
  if (query.excludeSubtasks) {
    ticketsQuery = ticketsQuery.neq("type", "subtask")
  }
  if (query.departmentId) {
    if (query.departmentId === "no_department") {
      ticketsQuery = ticketsQuery.is("department_id", null)
    } else {
      ticketsQuery = ticketsQuery.eq("department_id", query.departmentId)
    }
  }
  if (query.requestedById) {
    ticketsQuery = ticketsQuery.eq("requested_by_id", query.requestedById)
  }
  if (query.epicId) {
    if (query.epicId === "no_epic") {
      ticketsQuery = ticketsQuery.is("epic_id", null)
    } else {
      ticketsQuery = ticketsQuery.eq("epic_id", query.epicId)
    }
  }
  if (query.sprintId) {
    if (query.sprintId === "no_sprint") {
      ticketsQuery = ticketsQuery.is("sprint_id", null)
    } else {
      ticketsQuery = ticketsQuery.eq("sprint_id", query.sprintId)
    }
  }
  if (
    query.excludeDone &&
    query.status !== "completed" &&
    query.status !== "cancelled" &&
    query.status !== "rejected"
  ) {
    ticketsQuery = ticketsQuery.not("status", "in", "(completed,cancelled,rejected)")
  }
  if (query.queryText) {
    const escaped = query.queryText.replace(/,/g, " ").trim()
    if (escaped) {
      ticketsQuery = ticketsQuery.or(
        `title.ilike.%${escaped}%,display_id.ilike.%${escaped}%,description.ilike.%${escaped}%`
      )
    }
  }

  ticketsQuery = applyTicketOrdering(ticketsQuery, query.sortBy, query.sortDirection)

  if (hasCursor && !useUnboundedMode) {
    const parsedCursor = parseCursor(query.cursor)
    if (parsedCursor) {
      if (parsedCursor.id && !query.queryText) {
        ticketsQuery = ticketsQuery.or(
          `created_at.lt.${parsedCursor.createdAt},and(created_at.eq.${parsedCursor.createdAt},id.lt.${parsedCursor.id})`
        )
      } else {
        ticketsQuery = ticketsQuery.lt("created_at", parsedCursor.createdAt)
      }
    }
  }

  if (usePageMode && limit) {
    ticketsQuery = ticketsQuery.range(offset, offset + limit - 1)
  } else if (!useUnboundedMode && limit) {
    ticketsQuery = ticketsQuery.limit(limit + 1)
  }

  const { data, error, count } = await ticketsQuery
  if (error) {
    throw error
  }

  const rows = data || []
  const pageRows = useUnboundedMode ? rows : usePageMode ? rows : rows.slice(0, limit as number)

  let nextCursor: string | null = null
  if (pageRows.length > 0) {
    if (!useUnboundedMode && !usePageMode && limit && rows.length > limit) {
      const lastRow = pageRows[pageRows.length - 1] as { created_at?: string; id?: string } | undefined
      if (lastRow?.created_at && lastRow?.id) {
        nextCursor = `${lastRow.created_at}|${lastRow.id}`
      }
    } else if (usePageMode && limit && (count || 0) > page * limit) {
      const lastRow = pageRows[pageRows.length - 1] as { created_at?: string; id?: string } | undefined
      if (lastRow?.created_at && lastRow?.id) {
        nextCursor = `${lastRow.created_at}|${lastRow.id}`
      }
    }
  }

  const items: TicketListItem[] = (pageRows as any[]).map((row) => {
    const assignee = normalizeUser(row.assignee)
    const sqaAssignee = normalizeUser(row.sqa_assignee)
    const requestedBy = normalizeUser(row.requested_by)

    return {
      id: row.id,
      display_id: row.display_id,
      parent_ticket_id: row.parent_ticket_id ?? null,
      title: row.title,
      status: row.status,
      priority: row.priority,
      type: row.type,
      due_date: row.due_date ?? null,
      links: sanitizeLinkArray(row.links),
      reason: row.reason ?? null,
      assigned_at: row.assigned_at ?? null,
      sqa_assigned_at: row.sqa_assigned_at ?? null,
      started_at: row.started_at ?? null,
      completed_at: row.completed_at ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      project: normalizeRelation(row.project),
      assignee: toTicketPerson(assignee),
      sqa_assignee: toTicketPerson(sqaAssignee),
      requested_by: toTicketPerson(requestedBy),
      department: normalizeRelation(row.department),
      epic: normalizeRelation(row.epic),
      sprint: normalizeRelation(row.sprint),
    }
  })

  const pageInfo = usePageMode
    ? {
        page,
        limit: limit as number,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / (limit as number))),
      }
    : undefined

  return {
    items,
    nextCursor,
    ...(pageInfo ? { pageInfo } : {}),
  }
}

