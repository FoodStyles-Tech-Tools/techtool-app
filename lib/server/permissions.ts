import "server-only"

import { createServerClient } from "@/lib/supabase"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getServerCache, setServerCache } from "@/lib/server/cache"

export type Permission = {
  resource: string
  action: string
}

export type PermissionsUser = {
  id: string
  email: string
  name: string | null
  role: string | null
  image: string | null
  permissions: Permission[]
}

export type PermissionFlags = {
  canViewProjects: boolean
  canCreateProjects: boolean
  canEditProjects: boolean
  canViewAssets: boolean
  canCreateAssets: boolean
  canEditAssets: boolean
  canDeleteAssets: boolean
  canManageAssets: boolean
  canViewClockify: boolean
  canManageClockify: boolean
  canViewTickets: boolean
  canCreateTickets: boolean
  canEditTickets: boolean
  canViewUsers: boolean
  canCreateUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
  canViewRoles: boolean
  canCreateRoles: boolean
  canEditRoles: boolean
  canDeleteRoles: boolean
  canManageStatus: boolean
  canManageSettings: boolean
  canAccessSettings: boolean
}

const ALL_RESOURCES = ["projects", "tickets", "users", "roles", "settings", "assets", "clockify", "status"] as const
const ALL_ACTIONS = ["view", "create", "edit", "delete", "manage"] as const
const PERMISSIONS_CACHE_TTL_MS = 60 * 1000

export function buildPermissionFlags(permissions: Permission[]): PermissionFlags {
  const has = (resource: string, action: string) =>
    permissions.some((p) => p.resource === resource && p.action === action)

  const canViewProjects = has("projects", "view")
  const canCreateProjects = has("projects", "create")
  const canEditProjects = has("projects", "edit")
  const canViewAssets = has("assets", "view")
  const canCreateAssets = has("assets", "create")
  const canEditAssets = has("assets", "edit")
  const canDeleteAssets = has("assets", "delete")
  const canManageAssets = has("assets", "manage")
  const canViewClockify = has("clockify", "view")
  const canManageClockify = has("clockify", "manage")
  const canViewTickets = has("tickets", "view")
  const canCreateTickets = has("tickets", "create")
  const canEditTickets = has("tickets", "edit")
  const canViewUsers = has("users", "view")
  const canCreateUsers = has("users", "create")
  const canEditUsers = has("users", "edit")
  const canDeleteUsers = has("users", "delete")
  const canViewRoles = has("roles", "view")
  const canCreateRoles = has("roles", "create")
  const canEditRoles = has("roles", "edit")
  const canDeleteRoles = has("roles", "delete")
  const canManageStatus = has("status", "manage")
  const canManageSettings = has("settings", "manage")
  const canAccessSettings =
    has("users", "view") ||
    has("roles", "view") ||
    has("roles", "edit") ||
    has("roles", "create") ||
    has("roles", "manage") ||
    has("status", "manage") ||
    has("settings", "manage")

  return {
    canViewProjects,
    canCreateProjects,
    canEditProjects,
    canViewAssets,
    canCreateAssets,
    canEditAssets,
    canDeleteAssets,
    canManageAssets,
    canViewClockify,
    canManageClockify,
    canViewTickets,
    canCreateTickets,
    canEditTickets,
    canViewUsers,
    canCreateUsers,
    canEditUsers,
    canDeleteUsers,
    canViewRoles,
    canCreateRoles,
    canEditRoles,
    canDeleteRoles,
    canManageStatus,
    canManageSettings,
    canAccessSettings,
  }
}

export async function getCurrentUserPermissions(
  session?: Awaited<ReturnType<typeof auth.api.getSession>>
): Promise<PermissionsUser | null> {
  const currentSession =
    session ||
    (await auth.api.getSession({
      headers: await headers(),
    }))

  if (!currentSession?.user?.email) {
    return null
  }

  const cacheKey = currentSession.user.email
  const cached = await getServerCache<PermissionsUser | null>(`permissions:${cacheKey}`)
  if (cached !== null) {
    return cached
  }

  const supabase = createServerClient()
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", currentSession.user.email)
    .single()

  if (error || !user) {
    await setServerCache(`permissions:${cacheKey}`, null, PERMISSIONS_CACHE_TTL_MS / 1000)
    return null
  }

  const { data: authUser } = await supabase
    .from("auth_user")
    .select("image")
    .eq("email", user.email)
    .single()

  let permissions: Permission[] = []

  if (user.role?.toLowerCase() === "admin") {
    permissions = ALL_RESOURCES.flatMap((resource) =>
      ALL_ACTIONS.map((action) => ({ resource, action }))
    )
  } else {
    const { data: roleData } = await supabase
      .from("roles")
      .select("id")
      .ilike("name", user.role || "")
      .single()

    if (roleData) {
      const { data: permData } = await supabase
        .from("permissions")
        .select("resource, action")
        .eq("role_id", roleData.id)

      if (permData) {
        permissions = permData.map((p) => ({
          resource: p.resource,
          action: p.action,
        }))
      }
    }
  }

  const resolvedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    image: authUser?.image || null,
    role: user.role,
    permissions,
  }

  await setServerCache(
    `permissions:${cacheKey}`,
    resolvedUser,
    PERMISSIONS_CACHE_TTL_MS / 1000
  )

  return resolvedUser
}
