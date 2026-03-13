/**
 * Report session date range helpers.
 * Default: latest 5 completed ISO weeks (exclude current ongoing week).
 * ISO week: Monday = start, week number per ISO 8601.
 */

import { startOfWeek, endOfWeek, subWeeks, getISOWeek, getISOWeekYear } from "date-fns"

const ISO_WEEK_OPTS = { weekStartsOn: 1 } as const

/** Start of current ISO week (Monday 00:00:00). */
export function startOfCurrentISOWeek(date: Date = new Date()): Date {
  return startOfWeek(date, ISO_WEEK_OPTS)
}

/** End of given ISO week (Sunday 23:59:59.999). */
export function endOfISOWeek(date: Date): Date {
  return endOfWeek(date, ISO_WEEK_OPTS)
}

/** Default report range: latest 5 completed weeks (exclude current week). */
export function getDefaultReportDateRange(now: Date = new Date()): { start: Date; end: Date } {
  const currentWeekStart = startOfCurrentISOWeek(now)
  const lastCompletedWeekEnd = endOfISOWeek(subWeeks(currentWeekStart, 1))
  const start = startOfWeek(subWeeks(currentWeekStart, 5), ISO_WEEK_OPTS)
  return { start, end: lastCompletedWeekEnd }
}

/** Get ISO week key for a date (e.g. "2026-W09" for grouping). */
export function getISOWeekKey(date: Date): string {
  const year = getISOWeekYear(date)
  const week = getISOWeek(date)
  return `${year}-W${String(week).padStart(2, "0")}`
}
