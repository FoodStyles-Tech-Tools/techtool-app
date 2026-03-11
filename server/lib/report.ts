import { getSupabaseWithUserContext } from "./auth-helpers"
import { getISOWeekKey } from "@shared/report-date-range"
import type {
  ReportDataPayload,
  VolumeByWeek,
  RequesterCount,
  StatusCounts,
  AvgResponseTimeByPriority,
  AvgLeadTimeByPriority,
  AvgResponseTimeByWeekItem,
  AvgLeadTimeByWeekItem,
  ReportSessionFilters,
} from "@shared/types/api/report"

const OPEN_STATUS = "open"
const DONE_STATUSES = new Set(["completed", "cancelled", "rejected"])

interface TicketRow {
  id: string
  created_at: string
  type: string
  status: string
  priority: string
  assigned_at: string | null
  completed_at: string | null
  requested_by_id: string
  requested_by: { id: string; name: string | null; email: string } | { id: string; name: string | null; email: string }[] | null
}

export async function getReportData(
  sessionId: string
): Promise<ReportDataPayload | null> {
  const { supabase } = await getSupabaseWithUserContext()

  const { data: session, error: sessionError } = await supabase
    .from("report_sessions")
    .select("date_range_start, date_range_end, filters")
    .eq("id", sessionId)
    .single()

  if (sessionError || !session) return null

  const start = session.date_range_start
  const end = session.date_range_end
  const filters = (session.filters ?? {}) as ReportSessionFilters

  let query = supabase
    .from("tickets")
    .select(
      `
      id,
      created_at,
      type,
      status,
      priority,
      assigned_at,
      completed_at,
      requested_by_id,
      requested_by:users!tickets_requested_by_id_fkey(id, name, email)
    `
    )
    .gte("created_at", start)
    .lte("created_at", end)

  if (filters.projectId) {
    query = query.eq("project_id", filters.projectId)
  }
  if (filters.assigneeId) {
    if (filters.assigneeId === "unassigned") {
      query = query.is("assignee_id", null)
    } else {
      query = query.eq("assignee_id", filters.assigneeId)
    }
  }
  if (filters.departmentId) {
    if (filters.departmentId === "no_department") {
      query = query.is("department_id", null)
    } else {
      query = query.eq("department_id", filters.departmentId)
    }
  }
  if (filters.requestedById) {
    query = query.eq("requested_by_id", filters.requestedById)
  }
  if (filters.status) {
    query = query.eq("status", filters.status)
  }

  const { data: rows, error } = await query

  if (error) throw error

  const tickets = (rows ?? []) as TicketRow[]

  function normalizeUser(u: any): { id: string; name: string | null; email: string } | null {
    if (!u) return null
    const arr = Array.isArray(u) ? u : [u]
    const v = arr[0]
    return v ? { id: v.id, name: v.name ?? null, email: v.email } : null
  }

  const volumeByWeekMap = new Map<string, { total: number; byType: Record<string, number> }>()

  const requesterCountMap = new Map<string, { name: string | null; email: string; count: number }>()

  let open = 0
  let inProgress = 0
  let done = 0

  const responseTimeByPriority = new Map<string, { sumMs: number; count: number }>()
  const leadTimeByPriority = new Map<string, { sumMs: number; count: number }>()
  const responseTimeByWeekAndPriority = new Map<string, Map<string, { sumMs: number; count: number }>>()
  const leadTimeByWeekAndPriority = new Map<string, Map<string, { sumMs: number; count: number }>>()

  for (const t of tickets) {
    const created = new Date(t.created_at)
    const createdWeekKey = getISOWeekKey(created)

    if (!volumeByWeekMap.has(createdWeekKey)) {
      volumeByWeekMap.set(createdWeekKey, { total: 0, byType: {} })
    }
    const v = volumeByWeekMap.get(createdWeekKey)!
    v.total += 1
    v.byType[t.type] = (v.byType[t.type] ?? 0) + 1

    const req = normalizeUser(t.requested_by)
    const reqId = t.requested_by_id
    if (!requesterCountMap.has(reqId)) {
      requesterCountMap.set(reqId, {
        name: req?.name ?? null,
        email: req?.email ?? "",
        count: 0,
      })
    }
    requesterCountMap.get(reqId)!.count += 1

    if (t.status === OPEN_STATUS) {
      open += 1
    } else if (DONE_STATUSES.has(t.status)) {
      done += 1
    } else {
      inProgress += 1
    }

    if (t.assigned_at) {
      const createdMs = new Date(t.created_at).getTime()
      const assignedDate = new Date(t.assigned_at)
      const assignedMs = assignedDate.getTime()
      const assignedWeekKey = getISOWeekKey(assignedDate)
      const diffMs = assignedMs - createdMs
      if (!responseTimeByPriority.has(t.priority)) {
        responseTimeByPriority.set(t.priority, { sumMs: 0, count: 0 })
      }
      const r = responseTimeByPriority.get(t.priority)!
      r.sumMs += diffMs
      r.count += 1
      if (!responseTimeByWeekAndPriority.has(assignedWeekKey)) {
        responseTimeByWeekAndPriority.set(assignedWeekKey, new Map())
      }
      const rw = responseTimeByWeekAndPriority.get(assignedWeekKey)!
      if (!rw.has(t.priority)) rw.set(t.priority, { sumMs: 0, count: 0 })
      const rwp = rw.get(t.priority)!
      rwp.sumMs += diffMs
      rwp.count += 1
    }

    if (t.completed_at) {
      const createdMs = new Date(t.created_at).getTime()
      const completedDate = new Date(t.completed_at)
      const completedMs = completedDate.getTime()
      const completedWeekKey = getISOWeekKey(completedDate)
      const diffMs = completedMs - createdMs
      if (!leadTimeByPriority.has(t.priority)) {
        leadTimeByPriority.set(t.priority, { sumMs: 0, count: 0 })
      }
      const l = leadTimeByPriority.get(t.priority)!
      l.sumMs += diffMs
      l.count += 1
      if (!leadTimeByWeekAndPriority.has(completedWeekKey)) {
        leadTimeByWeekAndPriority.set(completedWeekKey, new Map())
      }
      const lw = leadTimeByWeekAndPriority.get(completedWeekKey)!
      if (!lw.has(t.priority)) lw.set(t.priority, { sumMs: 0, count: 0 })
      const lwp = lw.get(t.priority)!
      lwp.sumMs += diffMs
      lwp.count += 1
    }
  }

  const volumeByWeek: VolumeByWeek[] = Array.from(volumeByWeekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekKey, v]) => {
      const [y, wPart] = weekKey.split("-")
      const wNum = wPart?.replace(/^W0?/, "") ?? ""
      return {
        weekLabel: `${y} W${wNum}`,
        weekKey,
        total: v.total,
        byType: v.byType,
      }
    })

  const requesters: RequesterCount[] = Array.from(requesterCountMap.entries())
    .map(([id, v]) => ({
      id,
      name: v.name,
      email: v.email,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count)

  const statusCounts: StatusCounts = { open, inProgress, done }

  const avgResponseTimeByPriority: AvgResponseTimeByPriority[] = Array.from(
    responseTimeByPriority.entries()
  ).map(([priority, { sumMs, count }]) => ({
    priority,
    averageHours: sumMs / (1000 * 60 * 60 * count),
    count,
  }))

  const avgLeadTimeByPriority: AvgLeadTimeByPriority[] = Array.from(
    leadTimeByPriority.entries()
  ).map(([priority, { sumMs, count }]) => ({
    priority,
    averageHours: sumMs / (1000 * 60 * 60 * count),
    count,
  }))

  const msToDays = (ms: number) => ms / (1000 * 60 * 60 * 24)
  const responseWeekKeysSorted = Array.from(responseTimeByWeekAndPriority.keys()).sort()
  const leadWeekKeysSorted = Array.from(leadTimeByWeekAndPriority.keys()).sort()

  const avgResponseTimeByWeek: AvgResponseTimeByWeekItem[] = responseWeekKeysSorted.map((weekKey) => {
    const [y, wPart] = weekKey.split("-")
    const wNum = wPart?.replace(/^W0?/, "") ?? ""
    const byPriority = Array.from(responseTimeByWeekAndPriority.get(weekKey)?.entries() ?? []).map(
      ([priority, { sumMs, count }]) => ({
        priority,
        averageDays: msToDays(sumMs) / count,
        count,
      })
    )
    return {
      weekLabel: `${y} W${wNum}`,
      weekKey,
      byPriority,
    }
  })

  const avgLeadTimeByWeek: AvgLeadTimeByWeekItem[] = leadWeekKeysSorted.map((weekKey) => {
    const [y, wPart] = weekKey.split("-")
    const wNum = wPart?.replace(/^W0?/, "") ?? ""
    const byPriority = Array.from(leadTimeByWeekAndPriority.get(weekKey)?.entries() ?? []).map(
      ([priority, { sumMs, count }]) => ({
        priority,
        averageDays: msToDays(sumMs) / count,
        count,
      })
    )
    return {
      weekLabel: `${y} W${wNum}`,
      weekKey,
      byPriority,
    }
  })

  return {
    volumeByWeek,
    requesters,
    statusCounts,
    avgResponseTimeByPriority,
    avgLeadTimeByPriority,
    avgResponseTimeByWeek,
    avgLeadTimeByWeek,
  }
}

