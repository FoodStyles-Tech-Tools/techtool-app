import type { RequestContext } from "@/lib/auth-helpers"
import { getDefaultReportDateRange } from "@/lib/report-date-range"
import { getReportData } from "@/lib/server/report"
import { HttpError } from "@server/http/http-error"
import * as reportSessionsRepository from "@server/repositories/report-sessions-repository"
import type { ReportSessionFilters } from "@shared/types/api/report"

function resolveDateRange(input: { date_range_start?: string; date_range_end?: string }) {
  const { start: defaultStart, end: defaultEnd } = getDefaultReportDateRange()
  let date_range_start = defaultStart.toISOString()
  let date_range_end = defaultEnd.toISOString()

  const hasCustomStart = typeof input.date_range_start === "string"
  const hasCustomEnd = typeof input.date_range_end === "string"

  if (hasCustomStart !== hasCustomEnd) {
    throw new HttpError(400, "Both date_range_start and date_range_end are required")
  }

  if (hasCustomStart && hasCustomEnd) {
    const parsedStart = new Date(input.date_range_start as string)
    const parsedEnd = new Date(input.date_range_end as string)

    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      throw new HttpError(400, "Invalid date range")
    }

    if (parsedStart.getTime() > parsedEnd.getTime()) {
      throw new HttpError(400, "date_range_start must be <= date_range_end")
    }

    date_range_start = parsedStart.toISOString()
    date_range_end = parsedEnd.toISOString()
  }

  return { date_range_start, date_range_end }
}

export async function listReportSessions(context: RequestContext) {
  return reportSessionsRepository.listReportSessions(context.supabase)
}

export async function createReportSession(
  context: RequestContext,
  input: {
    name: string | null
    date_range_start?: string
    date_range_end?: string
    filters: ReportSessionFilters
  }
) {
  const dates = resolveDateRange(input)
  return reportSessionsRepository.createReportSession(context.supabase, {
    created_by_id: context.userId,
    name: input.name,
    date_range_start: dates.date_range_start,
    date_range_end: dates.date_range_end,
    filters: input.filters,
  })
}

export async function getReportSession(context: RequestContext, id: string) {
  const session = await reportSessionsRepository.getReportSessionById(context.supabase, id)
  if (!session) {
    throw new HttpError(404, "Not found")
  }
  return session
}

export async function updateReportSession(
  context: RequestContext,
  id: string,
  input: {
    name?: string | null
    date_range_start?: string
    date_range_end?: string
    filters?: ReportSessionFilters
    insights?: string | null
  }
) {
  const updates: Record<string, unknown> = {}

  if (input.name !== undefined) updates.name = input.name
  if (input.date_range_start !== undefined) updates.date_range_start = input.date_range_start
  if (input.date_range_end !== undefined) updates.date_range_end = input.date_range_end
  if (input.filters !== undefined) updates.filters = input.filters
  if (input.insights !== undefined) updates.insights = input.insights

  if (Object.keys(updates).length === 0) {
    const existing = await reportSessionsRepository.getReportSessionById(context.supabase, id)
    if (!existing) {
      throw new HttpError(404, "Not found")
    }
    return existing
  }

  const session = await reportSessionsRepository.updateReportSession(context.supabase, id, updates)
  if (!session) {
    throw new HttpError(404, "Not found")
  }
  return session
}

export async function deleteReportSession(context: RequestContext, id: string) {
  await reportSessionsRepository.deleteReportSession(context.supabase, id)
}

export async function getReportSessionData(id: string) {
  const data = await getReportData(id)
  if (!data) {
    throw new HttpError(404, "Session not found")
  }
  return data
}
