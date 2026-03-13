import { HttpError } from "@server/http/http-error"
import type { RequestContext } from "@server/lib/auth-helpers"
import { listAuditLog } from "@server/repositories/audit-log-repository"

export type GetAuditLogParams = {
  module?: string
  resource_id?: string
  limit?: number
}

export async function getAuditLog(
  context: RequestContext,
  params: GetAuditLogParams
) {
  const { data, error } = await listAuditLog(context.supabase, {
    module: params.module,
    resource_id: params.resource_id,
    limit: params.limit,
  })

  if (error) {
    throw new HttpError(500, "Failed to fetch audit log")
  }

  const activities = (data || []).map((row: Record<string, unknown>) => ({
    ...row,
    actor: Array.isArray(row.actor) ? row.actor[0] ?? null : row.actor ?? null,
  }))

  return { activities }
}
