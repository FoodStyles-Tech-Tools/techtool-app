import type { RequestContext } from "@/lib/auth-helpers"
import { HttpError } from "@server/http/http-error"
import * as rolesRepository from "@server/repositories/roles-repository"
import type { CreateRoleInput, UpdateRoleInput } from "@server/validation/roles"

function isAdminRole(name: string | null | undefined) {
  return name?.toLowerCase() === "admin"
}

export async function listRoles(context: RequestContext) {
  return {
    roles: await rolesRepository.listRoles(context.supabase),
  }
}

export async function getRole(context: RequestContext, id: string) {
  const role = await rolesRepository.getRoleById(context.supabase, id)

  if (!role) {
    throw new HttpError(404, "Role not found")
  }

  return { role }
}

export async function createRole(context: RequestContext, input: CreateRoleInput) {
  const createdRole = await rolesRepository.createRole(context.supabase, {
    name: input.name,
    description: input.description ?? null,
  })

  if (input.permissions.length > 0) {
    await rolesRepository.replaceRolePermissions(context.supabase, createdRole.id, input.permissions)
  }

  const role = await rolesRepository.getRoleById(context.supabase, createdRole.id)
  if (!role) {
    throw new HttpError(500, "Failed to fetch created role")
  }

  return { role }
}

export async function updateRole(context: RequestContext, id: string, input: UpdateRoleInput) {
  const existingRole = await rolesRepository.getRoleSummary(context.supabase, id)

  if (!existingRole) {
    throw new HttpError(404, "Role not found")
  }

  if (isAdminRole(existingRole.name) && input.name && input.name !== existingRole.name) {
    throw new HttpError(400, "Cannot rename admin role")
  }

  if (isAdminRole(existingRole.name) && input.permissions !== undefined) {
    throw new HttpError(400, "Cannot modify permissions for admin role")
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) {
    updates.name = input.name
  }
  if (input.description !== undefined) {
    updates.description = input.description
  }

  if (Object.keys(updates).length > 0) {
    await rolesRepository.updateRole(context.supabase, id, updates)
  }

  if (input.permissions !== undefined) {
    await rolesRepository.replaceRolePermissions(context.supabase, id, input.permissions)
  }

  const role = await rolesRepository.getRoleById(context.supabase, id)
  if (!role) {
    throw new HttpError(404, "Role not found")
  }

  return { role }
}

export async function deleteRole(context: RequestContext, id: string) {
  const existingRole = await rolesRepository.getRoleSummary(context.supabase, id)

  if (!existingRole) {
    throw new HttpError(404, "Role not found")
  }

  if (isAdminRole(existingRole.name)) {
    throw new HttpError(400, "Cannot delete admin role")
  }

  await rolesRepository.deleteRole(context.supabase, id)

  return { success: true }
}
