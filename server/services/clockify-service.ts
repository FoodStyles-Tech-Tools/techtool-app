import type { RequestContext } from "@server/lib/auth-helpers"
import { HttpError } from "@server/http/http-error"
import * as clockifyRepository from "@server/repositories/clockify-repository"
import type { ClockifyReconciliationEntry } from "@server/validation/clockify"

const CLOCKIFY_API_URL = "https://reports.api.clockify.me/v1"
const CLOCKIFY_PAGE_SIZE = 1000
const CLOCKIFY_MAX_PAGES = 200
const DEFAULT_SCHEDULE = "weekly"

type ClockifyReportEntry = Record<string, unknown>
type ClockifyReportData = Record<string, unknown>

function assertAdmin(context: RequestContext) {
  if (context.userRole?.toLowerCase() !== "admin") {
    throw new HttpError(403, "Forbidden: Admin access required")
  }
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function toClockifyDateTime(dateValue: string, isEnd: boolean) {
  const suffix = isEnd ? "T23:59:59.999Z" : "T00:00:00.000Z"
  return new Date(`${dateValue}${suffix}`).toISOString()
}

function getLastFullWeekRange() {
  const now = new Date()
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayOfWeek = utcToday.getUTCDay()
  const daysSinceMonday = (dayOfWeek + 6) % 7

  const mondayThisWeek = new Date(utcToday)
  mondayThisWeek.setUTCDate(utcToday.getUTCDate() - daysSinceMonday)

  const lastWeekStart = new Date(mondayThisWeek)
  lastWeekStart.setUTCDate(mondayThisWeek.getUTCDate() - 7)

  const lastWeekEnd = new Date(lastWeekStart)
  lastWeekEnd.setUTCDate(lastWeekStart.getUTCDate() + 6)

  return {
    startDate: formatDate(lastWeekStart),
    endDate: formatDate(lastWeekEnd),
  }
}

function extractEntries(reportData: unknown): ClockifyReportEntry[] {
  if (!reportData || typeof reportData !== "object") {
    return []
  }

  const candidate = reportData as { timeentries?: unknown; timeEntries?: unknown }
  if (Array.isArray(candidate.timeentries)) return candidate.timeentries as ClockifyReportEntry[]
  if (Array.isArray(candidate.timeEntries)) return candidate.timeEntries as ClockifyReportEntry[]
  return []
}

function assignEntries(reportData: unknown, entries: ClockifyReportEntry[]): ClockifyReportData {
  if (!reportData || typeof reportData !== "object") {
    return { timeentries: entries }
  }

  const base = reportData as ClockifyReportData & { timeentries?: unknown; timeEntries?: unknown }
  if (Array.isArray(base.timeentries)) {
    return { ...base, timeentries: entries }
  }
  if (Array.isArray(base.timeEntries)) {
    return { ...base, timeEntries: entries }
  }
  return { ...base, timeentries: entries }
}

function getEntryId(entry: ClockifyReportEntry) {
  const candidate = entry.id ?? entry._id ?? entry.timeEntryId
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null
}

async function fetchClockifyReport(
  startDate: string,
  endDate: string
): Promise<{ reportData: ClockifyReportData | null; status: string; errorMessage: string | null }> {
  const clockifyApiKey = process.env.CLOCKIFY_API_KEY
  const clockifyWorkspaceId = process.env.CLOCKIFY_WORKSPACE_ID

  if (!clockifyApiKey || !clockifyWorkspaceId) {
    throw new HttpError(500, "Clockify environment variables are not configured")
  }

  let reportData: ClockifyReportData | null = null
  let status = "success"
  let errorMessage: string | null = null

  try {
    const allEntries: ClockifyReportEntry[] = []
    let baseReport: ClockifyReportData | null = null
    let totalPages: number | null = null

    for (let page = 1; page <= CLOCKIFY_MAX_PAGES; page += 1) {
      const requestBody = {
        dateRangeStart: toClockifyDateTime(startDate, false),
        dateRangeEnd: toClockifyDateTime(endDate, true),
        detailedFilter: {
          page,
          pageSize: CLOCKIFY_PAGE_SIZE,
        },
      }

      const response = await fetch(
        `${CLOCKIFY_API_URL}/workspaces/${clockifyWorkspaceId}/reports/detailed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": clockifyApiKey,
          },
          body: JSON.stringify(requestBody),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        status = "failed"
        errorMessage = errorText || "Clockify API error"
        break
      }

      const pageReport = (await response.json()) as ClockifyReportData & {
        paging?: { totalPages?: number }
        totals?: { totalPages?: number }
      }

      if (!baseReport) {
        baseReport = pageReport
      }

      const pageEntries = extractEntries(pageReport)
      if (pageEntries.length > 0) {
        allEntries.push(...pageEntries)
      }

      if (typeof pageReport.paging?.totalPages === "number") {
        totalPages = pageReport.paging.totalPages
      } else if (typeof pageReport.totals?.totalPages === "number") {
        totalPages = pageReport.totals.totalPages
      }

      if (totalPages && page >= totalPages) {
        break
      }

      if (pageEntries.length < CLOCKIFY_PAGE_SIZE) {
        break
      }
    }

    if (status === "success") {
      reportData = assignEntries(baseReport, allEntries)
    }
  } catch (error) {
    status = "failed"
    errorMessage = error instanceof Error ? error.message : "Clockify request failed"
  }

  return { reportData, status, errorMessage }
}

export async function listClockifySessions(
  context: RequestContext,
  options: { start?: string; end?: string; limit?: number }
) {
  return {
    sessions: await clockifyRepository.listClockifySessions(context.supabase, options),
  }
}

export async function createClockifySession(
  context: RequestContext,
  input: { startDate?: string; endDate?: string; clearSessions?: boolean; replaceInRange?: boolean }
) {
  assertAdmin(context)

  let startDate = input.startDate
  let endDate = input.endDate

  if (!startDate || !endDate) {
    const defaultRange = getLastFullWeekRange()
    startDate = startDate || defaultRange.startDate
    endDate = endDate || defaultRange.endDate
  }

  const { reportData, status, errorMessage } = await fetchClockifyReport(startDate, endDate)

  if (input.clearSessions && status === "success") {
    await clockifyRepository.clearClockifySessions(context.supabase)
  }

  if (input.replaceInRange && status === "success") {
    await clockifyRepository.deleteClockifySessionsByRange(
      context.supabase,
      startDate,
      endDate
    )
  }

  const session = await clockifyRepository.createClockifySession(context.supabase, {
    start_date: startDate,
    end_date: endDate,
    status,
    error_message: errorMessage,
    report_data: reportData,
    requested_by_id: context.userId,
  })

  return {
    session,
    upstreamFailed: status !== "success",
    errorMessage,
  }
}

export async function updateClockifySessionReconciliation(
  context: RequestContext,
  input: {
    sessionId: string
    reconciliation?: Record<string, ClockifyReconciliationEntry>
  }
) {
  const existing = await clockifyRepository.getClockifySessionById(context.supabase, input.sessionId)
  if (!existing) {
    throw new HttpError(404, "Session not found")
  }

  const reportData = existing.report_data
  const entries = extractEntries(reportData)
  const reconcileMap = input.reconciliation || {}

  const updatedEntries = entries.map((entry) => {
    const entryId = getEntryId(entry)
    if (!entryId || !reconcileMap[entryId]) {
      return entry
    }

    const { ticketDisplayId, status, ticketId } = reconcileMap[entryId]
    return {
      ...entry,
      reconcileTicketDisplayId: ticketDisplayId || "",
      reconcileTicketId: ticketId || "",
      reconcileStatus: status || "",
    }
  })

  const updatedReportData = assignEntries(reportData, updatedEntries)
  const session = await clockifyRepository.updateClockifySessionReconciliation(
    context.supabase,
    input.sessionId,
    {
      report_data: updatedReportData,
      reconciliation: reconcileMap,
    }
  )

  return { session }
}

export async function deleteClockifySession(context: RequestContext, sessionId: string) {
  await clockifyRepository.deleteClockifySession(context.supabase, sessionId)
  return { success: true }
}

export async function getClockifySettings(context: RequestContext) {
  const existing = await clockifyRepository.getLatestClockifySettings(context.supabase)
  if (existing) {
    return { settings: existing }
  }

  return {
    settings: await clockifyRepository.createClockifySettings(context.supabase, DEFAULT_SCHEDULE),
  }
}

export async function updateClockifySettings(
  context: RequestContext,
  input: { schedule: string }
) {
  const existing = await clockifyRepository.getLatestClockifySettings(context.supabase)
  if (!existing) {
    return {
      settings: await clockifyRepository.createClockifySettings(context.supabase, input.schedule),
    }
  }

  return {
    settings: await clockifyRepository.updateClockifySettings(
      context.supabase,
      existing.id,
      input.schedule
    ),
  }
}

export async function searchClockifyTickets(
  context: RequestContext,
  options: { q: string; limit: number }
) {
  return {
    tickets: await clockifyRepository.searchClockifyTickets(context.supabase, {
      query: options.q,
      limit: options.limit,
    }),
  }
}

export async function reconcileClockifyTickets(
  context: RequestContext,
  displayIds: string[]
) {
  return {
    tickets: await clockifyRepository.findClockifyTicketsByDisplayIds(context.supabase, displayIds),
  }
}
