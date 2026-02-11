import "server-only"

import { getSupabaseWithUserContext } from "@/lib/auth-helpers"
import { DEFAULT_TICKET_STATUSES, sortTicketStatuses, type TicketStatus } from "@/lib/ticket-statuses"

export async function getTicketStatuses(): Promise<TicketStatus[]> {
  const { supabase } = await getSupabaseWithUserContext()
  const { data, error } = await supabase
    .from("ticket_statuses")
    .select("key, label, sort_order, color")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true })

  if (error) {
    console.error("Failed to load ticket statuses:", error)
    return sortTicketStatuses(DEFAULT_TICKET_STATUSES)
  }

  const sorted = sortTicketStatuses((data || []) as TicketStatus[])
  return sorted.length ? sorted : sortTicketStatuses(DEFAULT_TICKET_STATUSES)
}
