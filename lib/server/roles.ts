import "server-only"

import { getSupabaseWithUserContext } from "@/lib/auth-helpers"

export type ServerPermission = {
  id: string
  resource: string
  action: string
}

export type ServerRole = {
  id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
  permissions: ServerPermission[]
}

export async function getRolesWithPermissions(): Promise<ServerRole[]> {
  const { supabase } = await getSupabaseWithUserContext()
  const { data: roles, error } = await supabase
    .from("roles")
    .select("id, name, description, is_system, created_at, permissions:permissions(id, resource, action)")
    .order("name", { ascending: true })

  if (error) {
    console.error("Failed to load roles:", error)
    return []
  }

  return roles || []
}
