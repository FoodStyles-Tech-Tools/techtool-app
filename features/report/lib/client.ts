import { format } from "date-fns"
import type {
  ReportDataPayload,
  ReportInsightKey,
  ReportSession,
  ReportSessionInsights,
} from "@/types/api/report"

export const nativeSelectClassName =
  "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400"

export type CreateSessionBody = {
  name?: string | null
  date_range_start?: string
  date_range_end?: string
  filters?: object
}

const INSIGHT_KEYS: ReportInsightKey[] = [
  "volume",
  "requester",
  "status",
  "responseTime",
  "leadTime",
]

export async function fetchSessions(): Promise<ReportSession[]> {
  const res = await fetch("/api/report/sessions")
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to load sessions")
  }
  return res.json()
}

export async function createSession(body: CreateSessionBody): Promise<ReportSession> {
  const res = await fetch("/api/report/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to create session")
  }
  return res.json()
}

export async function updateSession(
  id: string,
  body: {
    name?: string | null
    date_range_start?: string
    date_range_end?: string
    filters?: object
    insights?: string | null
  }
): Promise<ReportSession> {
  const res = await fetch(`/api/report/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to update session")
  }
  return res.json()
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/report/sessions/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to delete session")
  }
}

export async function fetchReportData(sessionId: string): Promise<ReportDataPayload> {
  const res = await fetch(`/api/report/sessions/${sessionId}/data`)
  if (!res.ok) {
    if (res.status === 404) throw new Error("Session not found")
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to load report data")
  }
  return res.json()
}

export function formatSessionLabel(session: ReportSession): string {
  const start = format(new Date(session.date_range_start), "yyyy-MM-dd")
  const end = format(new Date(session.date_range_end), "yyyy-MM-dd")
  return session.name ? `${session.name} (${start} - ${end})` : `${start} - ${end}`
}

export function toDateInputValue(value: string): string {
  return format(new Date(value), "yyyy-MM-dd")
}

export function buildDateRangePayload(startDate: string, endDate: string): {
  date_range_start: string
  date_range_end: string
} {
  if (!startDate || !endDate) throw new Error("Start and end dates are required.")

  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T23:59:59.999Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date range.")
  }
  if (start.getTime() > end.getTime()) {
    throw new Error("Start date cannot be after end date.")
  }

  return {
    date_range_start: start.toISOString(),
    date_range_end: end.toISOString(),
  }
}

export function parseInsights(insights: string | null): ReportSessionInsights {
  if (!insights?.trim()) return {}

  try {
    const parsed = JSON.parse(insights) as Record<string, unknown>
    const out: ReportSessionInsights = {}

    for (const key of INSIGHT_KEYS) {
      const value = parsed[key]
      out[key] = typeof value === "string" ? value : null
    }

    return out
  } catch {
    return {}
  }
}
