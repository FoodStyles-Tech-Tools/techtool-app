import { auth } from "./auth"
import { headers } from "next/headers"
import { timeQuery } from "./query-timing"

export async function requireAuth() {
  return await timeQuery(
    "requireAuth() - session check",
    async () => {
      const session = await auth.api.getSession({
        headers: await headers(),
      })

      if (!session) {
        throw new Error("Unauthorized")
      }

      return session
    },
    50 // Log if >50ms
  )
}

/** Get current user's id from users table (by session email). Use in API routes. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await requireAuth()
  const { createServerClient } = await import("./supabase")
  const supabase = createServerClient()
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .single()
  return user?.id ?? null
}

/** Server Supabase client with RLS user context set. Use for comment/notification APIs so RLS sees the current user. */
export async function getSupabaseWithUserContext(): Promise<{ supabase: Awaited<ReturnType<typeof import("./supabase").createServerClient>>; userId: string }> {
  return await timeQuery(
    "getSupabaseWithUserContext()",
    async () => {
      const session = await requireAuth()
      const { createServerClient } = await import("./supabase")
      const supabase = createServerClient()
      
      // OPTIMIZED: Parallelize RPC call and user lookup
      const [rpcResult, userResult] = await Promise.all([
        supabase.rpc("set_user_context", { user_email: session.user.email ?? "" }),
        supabase.from("users").select("id").eq("email", session.user.email).single()
      ])
      
      if (rpcResult.error) {
        console.error("Error setting user context:", rpcResult.error)
      }
      
      const { data: user } = userResult
      if (!user?.id) throw new Error("User not found")
      return { supabase, userId: user.id }
    },
    100
  )
}

export async function requireAdmin() {
  const session = await requireAuth()
  
  // Get user from Supabase to check role
  const { supabase } = await import("./supabase")
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
  resource: "projects" | "tickets" | "users" | "roles" | "settings" | "assets" | "clockify" | "status",
  action: "view" | "create" | "edit" | "delete" | "manage",
  session?: Awaited<ReturnType<typeof requireAuth>> // Allow passing session to avoid double lookup
): Promise<boolean> {
  const userSession = session || await requireAuth()
  const { supabase } = await import("./supabase")
  
  // OPTIMIZED: Use covering index (email, id, role) - single query, index-only scan
  const { data: user } = await timeQuery(
    `hasPermission() - user lookup for ${resource}:${action}`,
    () => supabase
      .from("users")
      .select("id, role")
      .eq("email", userSession.user.email)
      .single(),
    50
  )

  if (!user) {
    return false
  }

  // Admin role always has all permissions (case-insensitive check)
  if (user.role?.toLowerCase() === "admin") {
    return true
  }

  // OPTIMIZED: Use LOWER() index for case-insensitive matching
  // Get role ID using optimized index (indexed on LOWER(name))
  const roleNameLower = (user.role || "").toLowerCase()
  const { data: roleData } = await timeQuery(
    `hasPermission() - role lookup for ${resource}:${action}`,
    () => supabase
      .from("roles")
      .select("id")
      .ilike("name", roleNameLower)
      .single(),
    50
  )

  if (!roleData) {
    return false
  }

  // OPTIMIZED: Use composite index (role_id, resource, action)
  const { data: permData, error } = await timeQuery(
    `hasPermission() - permission check for ${resource}:${action}`,
    () => supabase
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

/**
 * Require a specific permission, throw error if user doesn't have it
 * OPTIMIZED: Avoids double requireAuth() call
 */
export async function requirePermission(
  resource: "projects" | "tickets" | "users" | "roles" | "settings" | "assets" | "clockify" | "status",
  action: "view" | "create" | "edit" | "delete" | "manage"
) {
  return await timeQuery(
    `requirePermission() - ${resource}:${action}`,
    async () => {
      // Get session once
      const session = await requireAuth()
      
      // Pass session to hasPermission to avoid double lookup
      const hasPerm = await hasPermission(resource, action, session)
      
      if (!hasPerm) {
        throw new Error(`Forbidden: ${action} ${resource} permission required`)
      }
      
      return session
    },
    100 // Log if >100ms
  )
}

export async function requireProjectAccess(projectId: string) {
  const session = await requireAuth()
  
  const { supabase } = await import("./supabase")
  
  // Get user from users table
  const { data: user } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", session.user.email)
    .single()

  if (!user) {
    throw new Error("User not found")
  }

  // Check if user is owner or admin
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single()

  if (!project) {
    throw new Error("Project not found")
  }

  // Allow if admin or owner (case-insensitive check for admin)
  if (user.role?.toLowerCase() === "admin" || project.owner_id === user.id) {
    return session
  }

  throw new Error("Forbidden: Project access denied")
}

