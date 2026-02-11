import "server-only"

import { getSupabaseWithUserContext } from "@/lib/auth-helpers"
import { fetchGoogleCalendarEvents, refreshAccessToken } from "@/lib/google-calendar"
import { DEFAULT_TICKET_STATUSES, sortTicketStatuses, type TicketStatus } from "@/lib/ticket-statuses"
import type { CalendarEvent, TicketSummary } from "@/lib/types"

export type CalendarState = {
  status: "connected" | "needs_connection"
  events: CalendarEvent[]
  error: string | null
}

async function getCalendarState(
  supabase: Awaited<ReturnType<typeof getSupabaseWithUserContext>>["supabase"],
  userId: string
): Promise<CalendarState> {
  const { data: tokenRow, error } = await supabase
    .from("user_calendar_tokens")
    .select("id, refresh_token, access_token, access_token_expires_at, scope")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle()

  if (error) {
    return {
      status: "needs_connection",
      events: [],
      error: "Failed to load calendar connection",
    }
  }

  if (!tokenRow) {
    return { status: "needs_connection", events: [], error: null }
  }

  let accessToken = tokenRow.access_token
  const expiresAt = tokenRow.access_token_expires_at
  const shouldRefresh =
    !accessToken ||
    (typeof accessToken === "string" && accessToken.trim() === "") ||
    !expiresAt ||
    new Date(expiresAt).getTime() <= Date.now() + 60 * 1000

  if (shouldRefresh) {
    try {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token)
      accessToken = refreshed.access_token
      const expiresInSeconds = refreshed.expires_in || 3600
      const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

      await supabase
        .from("user_calendar_tokens")
        .update({
          access_token: refreshed.access_token,
          access_token_expires_at: newExpiresAt,
          scope: refreshed.scope || tokenRow.scope,
        })
        .eq("id", tokenRow.id)
    } catch (refreshError) {
      await supabase.from("user_calendar_tokens").delete().eq("id", tokenRow.id)
      return {
        status: "needs_connection",
        events: [],
        error: "Calendar connection expired. Please reconnect.",
      }
    }
  }

  if (!accessToken || (typeof accessToken === "string" && accessToken.trim() === "")) {
    return {
      status: "needs_connection",
      events: [],
      error: "Calendar token missing",
    }
  }

  try {
    const eventsResponse = await fetchGoogleCalendarEvents({ accessToken })
    return {
      status: "connected",
      events: (eventsResponse.items || []) as CalendarEvent[],
      error: null,
    }
  } catch (error) {
    return {
      status: "connected",
      events: [],
      error: error instanceof Error ? error.message : "Failed to load events",
    }
  }
}

export async function getDashboardData(): Promise<{
  tickets: TicketSummary[]
  ticketsError: string | null
  ticketStatuses: TicketStatus[]
  calendar: CalendarState
}> {
  const { supabase, userId } = await getSupabaseWithUserContext()

  const [ticketsResult, statusesResult, calendar] = await Promise.all([
    supabase
      .from("tickets")
      .select(
        `
        id,
        display_id,
        title,
        status,
        priority,
        created_at,
        project:projects(id, name)
      `
      )
      .eq("assignee_id", userId)
      .not("status", "in", "(completed,cancelled)")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ticket_statuses")
      .select("key, label, sort_order, color")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true }),
    getCalendarState(supabase, userId),
  ])

  const ticketsError = ticketsResult.error ? "Failed to load tickets" : null
  const tickets = (ticketsResult.data || []).map((ticket: any) => {
    const project = Array.isArray(ticket.project) ? ticket.project[0] || null : ticket.project
    return { ...ticket, project }
  }) as TicketSummary[]

  const statusFallback = sortTicketStatuses(DEFAULT_TICKET_STATUSES)
  const ticketStatuses = statusesResult.error
    ? statusFallback
    : sortTicketStatuses((statusesResult.data || []) as TicketStatus[])
  const resolvedStatuses = ticketStatuses.length ? ticketStatuses : statusFallback

  return {
    tickets,
    ticketsError,
    ticketStatuses: resolvedStatuses,
    calendar,
  }
}
