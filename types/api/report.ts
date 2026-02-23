/**
 * Report session and report data API types.
 */

export interface ReportSessionFilters {
  projectId?: string | null
  assigneeId?: string | null
  departmentId?: string | null
  requestedById?: string | null
  status?: string | null
}

/** Per-chart insight keys. Stored as JSON string in report_sessions.insights. */
export type ReportInsightKey = "volume" | "requester" | "status" | "responseTime" | "leadTime"

export interface ReportSessionInsights {
  volume?: string | null
  requester?: string | null
  status?: string | null
  responseTime?: string | null
  leadTime?: string | null
}

export interface ReportSession {
  id: string
  created_by_id: string
  name: string | null
  date_range_start: string
  date_range_end: string
  filters: ReportSessionFilters
  insights: string | null
  created_at: string
  updated_at: string
}

/** Volume by ISO week (e.g. 2026 W9). */
export interface VolumeByWeek {
  weekLabel: string
  weekKey: string
  total: number
  byType: Record<string, number>
}

/** Requester count. */
export interface RequesterCount {
  id: string
  name: string | null
  email: string
  count: number
}

/** Status counts for scorecard. */
export interface StatusCounts {
  open: number
  inProgress: number
  done: number
}

/** Average response time (assigned_at - created_at) in hours. */
export interface AvgResponseTimeByPriority {
  priority: string
  averageHours: number
  count: number
}

/** Average lead time (completed_at - created_at) in hours. */
export interface AvgLeadTimeByPriority {
  priority: string
  averageHours: number
  count: number
}

/** One week's average response time by priority (for weekly breakdown). averageDays = hours/24 */
export interface AvgResponseTimeByWeekItem {
  weekLabel: string
  weekKey: string
  byPriority: { priority: string; averageDays: number; count: number }[]
}

/** One week's average lead time by priority (for weekly breakdown). averageDays = hours/24 */
export interface AvgLeadTimeByWeekItem {
  weekLabel: string
  weekKey: string
  byPriority: { priority: string; averageDays: number; count: number }[]
}

export interface ReportDataPayload {
  volumeByWeek: VolumeByWeek[]
  requesters: RequesterCount[]
  statusCounts: StatusCounts
  avgResponseTimeByPriority: AvgResponseTimeByPriority[]
  avgLeadTimeByPriority: AvgLeadTimeByPriority[]
  avgResponseTimeByWeek: AvgResponseTimeByWeekItem[]
  avgLeadTimeByWeek: AvgLeadTimeByWeekItem[]
}
