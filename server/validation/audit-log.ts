import { z } from "zod"

const auditLogModuleSchema = z.enum([
  "projects",
  "epics",
  "sprints",
  "assets",
  "users",
  "roles",
  "tickets",
])

export const auditLogQuerySchema = z.object({
  module: auditLogModuleSchema.optional(),
  resource_id: z.string().uuid().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v != null ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(1).max(300).optional()),
})

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>

export function parseAuditLogQuery(query: Record<string, unknown>): AuditLogQuery {
  return auditLogQuerySchema.parse(query)
}
