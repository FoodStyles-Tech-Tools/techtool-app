import type { Request, Response } from "express"
import type { PermissionResource } from "@server/lib/auth-helpers"
import { getRequestContext } from "@server/lib/auth-helpers"
import { handleControllerError } from "@server/http/handle-controller-error"
import * as auditLogService from "@server/services/audit-log-service"
import { parseAuditLogQuery } from "@server/validation/audit-log"

function permissionResourceForModule(module: string): PermissionResource {
  switch (module) {
    case "projects":
    case "epics":
    case "sprints":
      return "projects"
    case "assets":
      return "assets"
    case "users":
      return "users"
    case "roles":
      return "roles"
    case "tickets":
      return "tickets"
    default:
      return "projects"
  }
}

export async function getAuditLogController(request: Request, response: Response) {
  try {
    const query = parseAuditLogQuery(request.query as Record<string, unknown>)

    if (query.module != null) {
      const resource = permissionResourceForModule(query.module)
      const { supabase, userId } = await getRequestContext({
        permission: { resource, action: "view" },
      })
      const payload = await auditLogService.getAuditLog(
        { supabase, userId },
        {
          module: query.module,
          resource_id: query.resource_id,
          limit: query.limit,
        }
      )
      response.json(payload)
      return
    }

    const { supabase, userId } = await getRequestContext({
      permission: { resource: "audit_log", action: "view" },
    })
    const payload = await auditLogService.getAuditLog(
      { supabase, userId },
      {
        resource_id: query.resource_id,
        limit: query.limit,
      }
    )
    response.json(payload)
  } catch (error) {
    handleControllerError(response, error, "Error in GET /api/audit-log")
  }
}
