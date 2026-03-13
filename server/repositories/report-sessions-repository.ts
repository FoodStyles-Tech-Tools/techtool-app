import { HttpError } from "@server/http/http-error"
import type { ReportSession, ReportSessionFilters } from "@shared/types/api/report"

type SupabaseClient = Awaited<ReturnType<typeof import("@server/lib/supabase").createServerClient>>

type ReportSessionRow = {
  id: string
  created_by_id: string
  name: string | null
  date_range_start: string
  date_range_end: string
  filters: unknown
  insights: string | null
  created_at: string
  updated_at: string
}

function toSession(row: ReportSessionRow): ReportSession {
  return {
    id: row.id,
    created_by_id: row.created_by_id,
    name: row.name,
    date_range_start: row.date_range_start,
    date_range_end: row.date_range_end,
    filters: (row.filters ?? {}) as ReportSessionFilters,
    insights: row.insights,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function listReportSessions(supabase: SupabaseClient): Promise<ReportSession[]> {
  const { data, error } = await supabase
    .from("report_sessions")
    .select("*")
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("GET /api/report/sessions:", error)
    throw new HttpError(500, "Internal server error")
  }

  return ((data ?? []) as ReportSessionRow[]).map(toSession)
}

export async function createReportSession(
  supabase: SupabaseClient,
  input: {
    created_by_id: string
    name: string | null
    date_range_start: string
    date_range_end: string
    filters: ReportSessionFilters
  }
): Promise<ReportSession> {
  const { data, error } = await supabase
    .from("report_sessions")
    .insert({
      created_by_id: input.created_by_id,
      name: input.name,
      date_range_start: input.date_range_start,
      date_range_end: input.date_range_end,
      filters: input.filters,
      insights: null,
    })
    .select("*")
    .single()

  if (error || !data) {
    console.error("POST /api/report/sessions:", error)
    throw new HttpError(500, "Internal server error")
  }

  return toSession(data as ReportSessionRow)
}

export async function getReportSessionById(supabase: SupabaseClient, id: string): Promise<ReportSession | null> {
  const { data, error } = await supabase
    .from("report_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("GET /api/report/sessions/:id:", error)
    throw new HttpError(500, "Internal server error")
  }

  if (!data) {
    return null
  }

  return toSession(data as ReportSessionRow)
}

export async function updateReportSession(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
): Promise<ReportSession | null> {
  const { data, error } = await supabase
    .from("report_sessions")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error) {
    console.error("PATCH /api/report/sessions/:id:", error)
    throw new HttpError(500, "Internal server error")
  }

  if (!data) {
    return null
  }

  return toSession(data as ReportSessionRow)
}

export async function deleteReportSession(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from("report_sessions")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("DELETE /api/report/sessions/:id:", error)
    throw new HttpError(500, "Internal server error")
  }
}
