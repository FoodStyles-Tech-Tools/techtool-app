import { createServerClient } from "./supabase"
import { auth } from "./auth"
import { getServerCache, setServerCache } from "./cache"
import { buildPermissionFlags } from "@shared/permissions"
import type { PermissionFlags } from "@shared/types/auth"

export { buildPermissionFlags } from "@/shared/permissions"

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

const ALL_RESOURCES = ["projects", "tickets", "users", "roles", "settings", "assets", "clockify", "status", "audit_log"] as const
const ALL_ACTIONS = ["view", "create", "edit", "delete", "manage"] as const
const PERMISSIONS_CACHE_TTL_MS = 60 * 1000

export async function getCurrentUserPermissions(
  session?: Awaited<ReturnType<typeof auth.api.getSession>>
): Promise<PermissionsUser | null> {
  const currentSession = session || (await auth.api.getSession())

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
    image: user.avatar_url || null,
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

