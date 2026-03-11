import { HttpError } from "@server/http/http-error"

export type RolePermissionRecord = {
  id?: string
  resource: string
  action: string
}

export type RoleRecord = {
  id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
  permissions: RolePermissionRecord[]
}

type SupabaseClient = Awaited<ReturnType<typeof import("@server/lib/supabase").createServerClient>>

export async function listRoles(supabase: SupabaseClient): Promise<RoleRecord[]> {
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, description, is_system, created_at, permissions:permissions(id, resource, action)")
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching roles:", error)
    throw new HttpError(500, "Failed to fetch roles")
  }

  return (data || []) as RoleRecord[]
}

export async function getRoleById(supabase: SupabaseClient, id: string): Promise<RoleRecord | null> {
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, description, is_system, created_at, permissions:permissions(id, resource, action)")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("Error fetching role:", error)
    throw new HttpError(500, "Failed to fetch role")
  }

  return (data as RoleRecord | null) ?? null
}

export async function getRoleSummary(
  supabase: SupabaseClient,
  id: string
): Promise<Pick<RoleRecord, "id" | "name" | "is_system"> | null> {
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, is_system")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("Error fetching role summary:", error)
    throw new HttpError(500, "Failed to fetch role")
  }

  return data ?? null
}

export async function createRole(
  supabase: SupabaseClient,
  input: { name: string; description: string | null }
) {
  const { data, error } = await supabase
    .from("roles")
    .insert({
      name: input.name,
      description: input.description,
      is_system: false,
    })
    .select("id")
    .single()

  if (error || !data?.id) {
    console.error("Error creating role:", error)
    throw new HttpError(500, "Failed to create role")
  }

  return data
}

export async function updateRole(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from("roles")
    .update(updates)
    .eq("id", id)

  if (error) {
    console.error("Error updating role:", error)
    throw new HttpError(500, "Failed to update role")
  }
}

export async function replaceRolePermissions(
  supabase: SupabaseClient,
  roleId: string,
  permissions: RolePermissionRecord[]
) {
  const { error: deleteError } = await supabase
    .from("permissions")
    .delete()
    .eq("role_id", roleId)

  if (deleteError) {
    console.error("Error deleting role permissions:", deleteError)
    throw new HttpError(500, "Failed to update role permissions")
  }

  if (permissions.length === 0) {
    return
  }

  const { error: insertError } = await supabase
    .from("permissions")
    .insert(
      permissions.map((permission) => ({
        role_id: roleId,
        resource: permission.resource,
        action: permission.action,
      }))
    )

  if (insertError) {
    console.error("Error inserting role permissions:", insertError)
    throw new HttpError(500, "Failed to update role permissions")
  }
}

export async function deleteRole(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("roles")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting role:", error)
    throw new HttpError(500, "Failed to delete role")
  }
}
