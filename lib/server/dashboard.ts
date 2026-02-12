import "server-only"

import { getSupabaseWithUserContext } from "@/lib/auth-helpers"
import { DEFAULT_TICKET_STATUSES, sortTicketStatuses, type TicketStatus } from "@/lib/ticket-statuses"
import type { TicketSummary } from "@/lib/types"
import { getCalendarStateWithCache, type CalendarState } from "@/lib/server/calendar-sync"
import { getOrSetServerCache } from "@/lib/server/cache"

export async function getDashboardData(): Promise<{
  tickets: TicketSummary[]
  ticketsError: string | null
  ticketStatuses: TicketStatus[]
  calendar: CalendarState
}> {
  const { supabase, userId } = await getSupabaseWithUserContext()

  const [ticketsResult, statusesResult, calendar] = await Promise.all([
    getOrSetServerCache(
      `dashboard:tickets:${userId}`,
      30,
      async () =>
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
          .limit(20)
    ),
    getOrSetServerCache(
      "dashboard:ticket-statuses",
      120,
      async () =>
        supabase
          .from("ticket_statuses")
          .select("key, label, sort_order, color")
          .order("sort_order", { ascending: true })
          .order("label", { ascending: true })
    ),
    getCalendarStateWithCache(supabase, userId),
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
