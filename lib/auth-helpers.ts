import { auth } from "./auth"
import { timeQuery } from "./query-timing"

export type PermissionResource =
  | "projects"
  | "tickets"
  | "users"
  | "roles"
  | "settings"
  | "assets"
  | "clockify"
  | "status"

export type PermissionAction = "view" | "create" | "edit" | "delete" | "manage"

export async function requireAuth() {
  return await timeQuery(
    "requireAuth() - session check",
    async () => {
      const session = await auth.api.getSession()

      if (!session) {
        throw new Error("Unauthorized")
      }

      return session
    },
    50 // Log if >50ms
  )
}

function isAdminRole(role: string | null | undefined): boolean {
  return role?.toLowerCase() === "admin"
}

async function resolvePermission(
  supabase: Awaited<ReturnType<typeof import("./supabase").createServerClient>>,
  roleName: string | null | undefined,
  resource: PermissionResource,
  action: PermissionAction
): Promise<boolean> {
  if (isAdminRole(roleName)) {
    return true
  }

  const roleNameLower = (roleName || "").toLowerCase()
  if (!roleNameLower) {
    return false
  }

  const { data: roleData } = await timeQuery(
    `resolvePermission() - role lookup for ${resource}:${action}`,
    () =>
      supabase
        .from("roles")
        .select("id")
        .ilike("name", roleNameLower)
        .single(),
    50
  )

  if (!roleData?.id) {
    return false
  }

  const { data: permData, error } = await timeQuery(
    `resolvePermission() - permission check for ${resource}:${action}`,
    () =>
      supabase
        .from("permissions")
        .select("id")
        .eq("role_id", roleData.id)
        .eq("resource", resource)
        .eq("action", action)
        .maybeSingle(),
    50
  )

  if (error) {
    console.error("Error checking permission:", error)
    return false
  }

  return !!permData
}

export type RequestContext = {
  session: Awaited<ReturnType<typeof requireAuth>>
  supabase: Awaited<ReturnType<typeof import("./supabase").createServerClient>>
  userId: string
  userRole: string | null
}

export async function getRequestContext(options?: {
  session?: Awaited<ReturnType<typeof requireAuth>>
  permission?: {
    resource: PermissionResource
    action: PermissionAction
  }
  requireUserContext?: boolean
}): Promise<RequestContext> {
  return await timeQuery(
    "getRequestContext()",
    async () => {
      const session = options?.session || (await requireAuth())
      const requireUserContext = options?.requireUserContext !== false
      const { createServerClient } = await import("./supabase")
      const supabase = createServerClient()

      const [userResult, rpcResult] = await Promise.all([
        supabase
          .from("users")
          .select("id, role")
          .eq("email", session.user.email)
          .single(),
        requireUserContext
          ? supabase.rpc("set_user_context", { user_email: session.user.email ?? "" })
          : Promise.resolve({ error: null }),
      ])

      if (rpcResult.error) {
        console.error("Error setting user context:", rpcResult.error)
      }

      const user = userResult.data
      if (!user?.id) {
        throw new Error("User not found")
      }

      if (options?.permission) {
        const allowed = await resolvePermission(
          supabase,
          user.role,
          options.permission.resource,
          options.permission.action
        )
        if (!allowed) {
          throw new Error(
            `Forbidden: ${options.permission.action} ${options.permission.resource} permission required`
          )
        }
      }

      return {
        session,
        supabase,
        userId: user.id,
        userRole: user.role ?? null,
      }
    },
    100
  )
}

/** Server Supabase client with RLS user context set. Use for comment/notification APIs so RLS sees the current user. */
export async function getSupabaseWithUserContext(): Promise<{ supabase: Awaited<ReturnType<typeof import("./supabase").createServerClient>>; userId: string }> {
  const context = await getRequestContext({ requireUserContext: true })
  return { supabase: context.supabase, userId: context.userId }
}

export async function requireAdmin() {
  const session = await requireAuth()

  const { createServerClient } = await import("./supabase")
  const supabase = createServerClient()
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("email", session.user.email)
    .single()

  if (!user || user.role?.toLowerCase() !== "admin") {
    throw new Error("Forbidden: Admin access required")
  }

  return session
}

/**
 * Check if the current user has a specific permission
 * Admin role always has all permissions
 * OPTIMIZED: Uses covering index and optimized queries
 */
export async function hasPermission(
  resource: PermissionResource,
  action: PermissionAction,
  session?: Awaited<ReturnType<typeof requireAuth>> // Allow passing session to avoid double lookup
): Promise<boolean> {
  const userSession = session || (await requireAuth())
  const { createServerClient } = await import("./supabase")
  const supabase = createServerClient()

  const { data: user } = await timeQuery(
    `hasPermission() - user lookup for ${resource}:${action}`,
    () =>
      supabase
        .from("users")
        .select("id, role")
        .eq("email", userSession.user.email)
        .single(),
    50
  )

  if (!user) {
    return false
  }

  return resolvePermission(supabase, user.role, resource, action)
}

/**
 * Require a specific permission, throw error if user doesn't have it
 * OPTIMIZED: Avoids double requireAuth() call
 */
export async function requirePermission(
  resource: PermissionResource,
  action: PermissionAction
) {
  const context = await getRequestContext({
    permission: { resource, action },
    requireUserContext: false,
  })
  return context.session
}
