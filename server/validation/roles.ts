import { z } from "zod"

const ROLE_PERMISSION_RESOURCES = [
  "projects",
  "deploy_rounds",
  "tickets",
  "users",
  "roles",
  "settings",
  "assets",
  "clockify",
  "status",
  "audit_log",
] as const

const ROLE_PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "manage"] as const

const roleIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Role id is required"),
})

const rolePermissionSchema = z.object({
  resource: z.enum(ROLE_PERMISSION_RESOURCES),
  action: z.enum(ROLE_PERMISSION_ACTIONS),
})

const descriptionValue = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value.length > 0 ? value : null))

const createRoleBodySchema = z.object({
  name: z.string().trim().min(1, "Role name is required"),
  description: descriptionValue.optional(),
  permissions: z
    .array(rolePermissionSchema)
    .optional()
    .transform((permissions) => dedupePermissions(permissions ?? [])),
})

const updateRoleBodySchema = z
  .object({
    name: z.string().trim().min(1, "Role name is required").optional(),
    description: descriptionValue.optional(),
    permissions: z
      .array(rolePermissionSchema)
      .optional()
      .transform((permissions) => (permissions ? dedupePermissions(permissions) : undefined)),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.description !== undefined ||
      body.permissions !== undefined,
    {
      message: "At least one role field must be provided",
    }
  )

function dedupePermissions(
  permissions: Array<{ resource: string; action: string }>
) {
  const seen = new Set<string>()

  return permissions.filter((permission) => {
    const signature = `${permission.resource}:${permission.action}`
    if (seen.has(signature)) {
      return false
    }
    seen.add(signature)
    return true
  })
}

export type CreateRoleInput = z.infer<typeof createRoleBodySchema>
export type UpdateRoleInput = z.infer<typeof updateRoleBodySchema>

export function parseRoleIdParams(input: unknown) {
  return roleIdParamsSchema.parse(input)
}

export function parseCreateRoleBody(input: unknown) {
  return createRoleBodySchema.parse(input)
}

export function parseUpdateRoleBody(input: unknown) {
  return updateRoleBodySchema.parse(input)
}
