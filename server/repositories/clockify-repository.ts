import { HttpError } from "@server/http/http-error"
import type { ClockifyReconciliationEntry } from "@server/validation/clockify"

type SupabaseClient = Awaited<ReturnType<typeof import("@server/lib/supabase").createServerClient>>

export type ClockifySessionRecord = {
  id: string
  start_date: string
  end_date: string
  fetched_at: string
  status: string
  error_message: string | null
  report_data?: unknown
  reconciliation?: Record<string, ClockifyReconciliationEntry>
  requested_by_id: string | null
  requested_by?: { id: string; name: string | null } | null
  created_at?: string
}

export type ClockifySettingsRecord = {
  id: string
  schedule: string
  created_at?: string
  updated_at?: string
}

export type ClockifyTicketLookupRecord = {
  id: string
  display_id: string
  title: string
}

export async function listClockifySessions(
  supabase: SupabaseClient,
  options: { start?: string; end?: string; limit?: number }
) {
  let query = supabase
    .from("clockify_report_sessions")
    // Exclude report_data and reconciliation — they can be very large and are not
    // needed on the list view; they are fetched on demand via getClockifySessionFull.
    .select(
      "id, start_date, end_date, fetched_at, status, error_message, requested_by_id, requested_by:users!clockify_report_sessions_requested_by_id_fkey(id, name)"
    )
    .order("fetched_at", { ascending: false })

  if (options.start) {
    query = query.eq("start_date", options.start)
  }

  if (options.end) {
    query = query.eq("end_date", options.end)
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching Clockify sessions:", error)
    throw new HttpError(500, "Failed to fetch sessions")
  }

  const sessions = (data || []).map((row: any) => ({
    ...row,
    requested_by: Array.isArray(row.requested_by) ? row.requested_by[0] ?? null : row.requested_by ?? null,
  })) as ClockifySessionRecord[]

  return sessions
}

export async function clearClockifySessions(supabase: SupabaseClient) {
  const { error } = await supabase
    .from("clockify_report_sessions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")

  if (error) {
    console.error("Error clearing Clockify sessions:", error)
    throw new HttpError(500, "Failed to clear Clockify sessions")
  }
}

export async function deleteClockifySessionsByRange(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
) {
  const { error } = await supabase
    .from("clockify_report_sessions")
    .delete()
    .eq("start_date", startDate)
    .eq("end_date", endDate)

  if (error) {
    console.error("Error deleting Clockify sessions by range:", error)
    throw new HttpError(500, "Failed to delete sessions for range")
  }
}

export async function createClockifySession(
  supabase: SupabaseClient,
  input: {
    start_date: string
    end_date: string
    status: string
    error_message: string | null
    report_data: unknown
    requested_by_id: string
  }
) {
  const { data, error } = await supabase
    .from("clockify_report_sessions")
    .insert(input)
    .select("*")
    .single()

  if (error || !data) {
    console.error("Error saving Clockify session:", error)
    throw new HttpError(500, "Failed to save Clockify session")
  }

  return data as ClockifySessionRecord
}

export async function getClockifySessionById(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .from("clockify_report_sessions")
    .select("id, report_data, reconciliation")
    .eq("id", sessionId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching Clockify session:", error)
    throw new HttpError(500, "Failed to fetch session")
  }

  return data as
    | {
        id: string
        report_data: unknown
        reconciliation?: Record<string, ClockifyReconciliationEntry>
      }
    | null
}

export async function getClockifySessionFull(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .from("clockify_report_sessions")
    .select("*, requested_by:users!clockify_report_sessions_requested_by_id_fkey(id, name)")
    .eq("id", sessionId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching Clockify session:", error)
    throw new HttpError(500, "Failed to fetch session")
  }

  return data as ClockifySessionRecord | null
}

export async function updateClockifySessionReconciliation(
  supabase: SupabaseClient,
  sessionId: string,
  input: {
    report_data: unknown
    reconciliation: Record<string, ClockifyReconciliationEntry>
  }
) {
  const { data, error } = await supabase
    .from("clockify_report_sessions")
    .update(input)
    .eq("id", sessionId)
    .select("*")
    .single()

  if (error || !data) {
    console.error("Error updating Clockify session:", error)
    throw new HttpError(500, "Failed to update session")
  }

  return data as ClockifySessionRecord
}

export async function deleteClockifySession(supabase: SupabaseClient, sessionId: string) {
  const { error } = await supabase
    .from("clockify_report_sessions")
    .delete()
    .eq("id", sessionId)

  if (error) {
    console.error("Error deleting Clockify session:", error)
    throw new HttpError(500, "Failed to delete session")
  }
}

export async function getLatestClockifySettings(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("clockify_settings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Error fetching Clockify settings:", error)
    throw new HttpError(500, "Failed to fetch settings")
  }

  return (data as ClockifySettingsRecord | null) || null
}

export async function createClockifySettings(supabase: SupabaseClient, schedule: string) {
  const { data, error } = await supabase
    .from("clockify_settings")
    .insert({ schedule })
    .select("*")
    .single()

  if (error || !data) {
    console.error("Error creating Clockify settings:", error)
    throw new HttpError(500, "Failed to create settings")
  }

  return data as ClockifySettingsRecord
}

export async function updateClockifySettings(
  supabase: SupabaseClient,
  id: string,
  schedule: string
) {
  const { data, error } = await supabase
    .from("clockify_settings")
    .update({ schedule })
    .eq("id", id)
    .select("*")
    .single()

  if (error || !data) {
    console.error("Error updating Clockify settings:", error)
    throw new HttpError(500, "Failed to update settings")
  }

  return data as ClockifySettingsRecord
}

export async function searchClockifyTickets(
  supabase: SupabaseClient,
  options: { query: string; limit: number }
) {
  let query = supabase
    .from("tickets")
    .select("id, display_id, title")
    .order("created_at", { ascending: false })
    .limit(options.limit)

  if (options.query) {
    query = query.ilike("display_id", `%${options.query}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error searching tickets:", error)
    throw new HttpError(500, "Failed to search tickets")
  }

  return (data || []) as ClockifyTicketLookupRecord[]
}

export async function findClockifyTicketsByDisplayIds(
  supabase: SupabaseClient,
  displayIds: string[]
) {
  if (displayIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from("tickets")
    .select("id, display_id, title")
    .in("display_id", displayIds)

  if (error) {
    console.error("Error fetching tickets for reconcile:", error)
    throw new HttpError(500, "Failed to fetch tickets")
  }

  return (data || []) as ClockifyTicketLookupRecord[]
}
