import { HttpError } from "@server/http/http-error"

export type TicketStatusRecord = {
  key: string
  label: string
  sort_order: number
  color: string
  created_at?: string
  updated_at?: string
}

type SupabaseClient = Awaited<ReturnType<typeof import("@server/lib/supabase").createServerClient>>

export async function listTicketStatuses(supabase: SupabaseClient): Promise<TicketStatusRecord[]> {
  const { data, error } = await supabase
    .from("ticket_statuses")
    .select("key, label, sort_order, color, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true })

  if (error) {
    console.error("Error fetching ticket statuses:", error)
    throw new HttpError(500, "Failed to fetch ticket statuses")
  }

  return (data || []) as TicketStatusRecord[]
}

export async function createTicketStatus(
  supabase: SupabaseClient,
  input: TicketStatusRecord
) {
  const { data, error } = await supabase
    .from("ticket_statuses")
    .insert(input)
    .select("key, label, sort_order, color, created_at, updated_at")
    .single()

  if (error) {
    console.error("Error creating ticket status:", error)
    const message =
      error.code === "23505"
        ? "A status with this key already exists"
        : "Failed to create status"
    throw new HttpError(500, message)
  }

  return data as TicketStatusRecord
}

export async function updateTicketStatus(
  supabase: SupabaseClient,
  key: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("ticket_statuses")
    .update(updates)
    .eq("key", key)
    .select("key, label, sort_order, color, created_at, updated_at")
    .maybeSingle()

  if (error) {
    console.error("Error updating ticket status:", error)
    throw new HttpError(500, "Failed to update status")
  }

  return (data as TicketStatusRecord | null) ?? null
}

export async function deleteTicketStatus(supabase: SupabaseClient, key: string) {
  const { error } = await supabase
    .from("ticket_statuses")
    .delete()
    .eq("key", key)

  if (error) {
    console.error("Error deleting ticket status:", error)
    const message =
      error.code === "23503"
        ? "Cannot delete a status that is in use by tickets"
        : "Failed to delete status"
    throw new HttpError(500, message)
  }
}

export async function reorderTicketStatuses(supabase: SupabaseClient, order: string[]) {
  const results = await Promise.all(
    order.map((key, index) =>
      supabase
        .from("ticket_statuses")
        .update({ sort_order: index + 1 })
        .eq("key", key)
    )
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) {
    console.error("Error reordering ticket statuses:", failed.error)
    throw new HttpError(500, "Failed to reorder statuses")
  }
}
