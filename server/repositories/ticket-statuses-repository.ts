import { HttpError } from "@server/http/http-error"

export type TicketStatusRecord = {
  key: string
  label: string
  sort_order: number
  color: string
  sqa_flow: boolean
  created_at?: string
  updated_at?: string
}

type SupabaseClient = Awaited<ReturnType<typeof import("@server/lib/supabase").createServerClient>>
const STATUS_SELECT_WITH_SQA = "key, label, sort_order, color, sqa_flow, created_at, updated_at"
const STATUS_SELECT_LEGACY = "key, label, sort_order, color, created_at, updated_at"
const LEGACY_SQA_FLOW_KEYS = new Set(["for_qa", "qa_pass", "returned_to_dev"])

function isMissingSqaFlowColumnError(error: { message?: string; details?: string } | null) {
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase()
  return message.includes("sqa_flow") && message.includes("column")
}

function normalizeStatusRecord(
  row: Partial<TicketStatusRecord> & { key: string; label: string; sort_order: number; color: string }
): TicketStatusRecord {
  const normalizedKey = String(row.key || "").trim().toLowerCase()
  const derivedSqaFlow = LEGACY_SQA_FLOW_KEYS.has(normalizedKey)

  return {
    key: row.key,
    label: row.label,
    sort_order: row.sort_order,
    color: row.color,
    sqa_flow: row.sqa_flow ?? derivedSqaFlow,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function listTicketStatuses(supabase: SupabaseClient): Promise<TicketStatusRecord[]> {
  const { data, error } = await supabase
    .from("ticket_statuses")
    .select(STATUS_SELECT_WITH_SQA)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true })

  if (error && isMissingSqaFlowColumnError(error)) {
    const legacyResult = await supabase
      .from("ticket_statuses")
      .select(STATUS_SELECT_LEGACY)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true })

    if (legacyResult.error) {
      console.error("Error fetching ticket statuses (legacy fallback):", legacyResult.error)
      throw new HttpError(500, "Failed to fetch ticket statuses")
    }

    return (legacyResult.data || []).map((row) =>
      normalizeStatusRecord(
        row as { key: string; label: string; sort_order: number; color: string; created_at?: string; updated_at?: string }
      )
    )
  }

  if (error) {
    console.error("Error fetching ticket statuses:", error)
    throw new HttpError(500, "Failed to fetch ticket statuses")
  }

  return (data || []).map((row) =>
    normalizeStatusRecord(
      row as {
        key: string
        label: string
        sort_order: number
        color: string
        sqa_flow?: boolean
        created_at?: string
        updated_at?: string
      }
    )
  )
}

export async function createTicketStatus(
  supabase: SupabaseClient,
  input: TicketStatusRecord
) {
  const { data, error } = await supabase
    .from("ticket_statuses")
    .insert(input)
    .select(STATUS_SELECT_WITH_SQA)
    .single()

  if (error && isMissingSqaFlowColumnError(error)) {
    const { sqa_flow: _ignored, ...legacyInput } = input
    const legacyResult = await supabase
      .from("ticket_statuses")
      .insert(legacyInput)
      .select(STATUS_SELECT_LEGACY)
      .single()

    if (legacyResult.error || !legacyResult.data) {
      console.error("Error creating ticket status (legacy fallback):", legacyResult.error)
      const message =
        legacyResult.error?.code === "23505"
          ? "A status with this key already exists"
          : "Failed to create status"
      throw new HttpError(500, message)
    }

    return normalizeStatusRecord(
      legacyResult.data as {
        key: string
        label: string
        sort_order: number
        color: string
        created_at?: string
        updated_at?: string
      }
    )
  }

  if (error) {
    console.error("Error creating ticket status:", error)
    const message =
      error.code === "23505"
        ? "A status with this key already exists"
        : "Failed to create status"
    throw new HttpError(500, message)
  }

  return normalizeStatusRecord(
    data as {
      key: string
      label: string
      sort_order: number
      color: string
      sqa_flow?: boolean
      created_at?: string
      updated_at?: string
    }
  )
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
    .select(STATUS_SELECT_WITH_SQA)
    .maybeSingle()

  if (error && isMissingSqaFlowColumnError(error)) {
    const { sqa_flow: _ignored, ...legacyUpdates } = updates
    const legacyResult = await supabase
      .from("ticket_statuses")
      .update(legacyUpdates)
      .eq("key", key)
      .select(STATUS_SELECT_LEGACY)
      .maybeSingle()

    if (legacyResult.error) {
      console.error("Error updating ticket status (legacy fallback):", legacyResult.error)
      throw new HttpError(500, "Failed to update status")
    }

    if (!legacyResult.data) {
      return null
    }

    return normalizeStatusRecord(
      legacyResult.data as {
        key: string
        label: string
        sort_order: number
        color: string
        created_at?: string
        updated_at?: string
      }
    )
  }

  if (error) {
    console.error("Error updating ticket status:", error)
    throw new HttpError(500, "Failed to update status")
  }

  if (!data) return null

  return normalizeStatusRecord(
    data as {
      key: string
      label: string
      sort_order: number
      color: string
      sqa_flow?: boolean
      created_at?: string
      updated_at?: string
    }
  )
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
