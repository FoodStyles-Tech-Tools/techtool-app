import { createServerClient } from "@server/lib/supabase"

type SupabaseClientLike = Awaited<ReturnType<typeof createServerClient>>

const AUDIT_LOG_SELECT = `
  id,
  module,
  resource_type,
  resource_id,
  ticket_id,
  event_type,
  field_name,
  old_value,
  new_value,
  metadata,
  created_at,
  actor:users!audit_log_actor_id_fkey(id, name, email, avatar_url)
`

export type ListAuditLogParams = {
  module?: string
  resource_id?: string
  limit?: number
}

/**
 * List audit_log rows, optionally for a single module and/or resource_id.
 * When module is omitted, returns all rows (RLS still applies; caller must have audit_log:view).
 */
export function listAuditLog(
  supabase: SupabaseClientLike,
  params: ListAuditLogParams
) {
  const limit = Math.min(params.limit ?? 100, 300)
  let query = supabase
    .from("audit_log")
    .select(AUDIT_LOG_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (params.module) {
    query = query.eq("module", params.module)
  }
  if (params.resource_id) {
    query = query.eq("resource_id", params.resource_id)
  }

  return query
}
