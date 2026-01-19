import { auth } from "./auth"
import { headers } from "next/headers"

export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    throw new Error("Unauthorized")
  }

  return session
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
 */
export async function hasPermission(
  resource: "projects" | "tickets" | "users" | "roles" | "settings" | "assets" | "clockify",
  action: "view" | "create" | "edit" | "delete" | "manage"
): Promise<boolean> {
  const session = await requireAuth()
  const { supabase } = await import("./supabase")
  
  // Get user from users table
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("email", session.user.email)
    .single()

  if (!user) {
    return false
  }

  // Admin role always has all permissions (case-insensitive check)
  if (user.role?.toLowerCase() === "admin") {
    return true
  }

  // Check permissions directly via query (more reliable than RPC with enums)
  // First get the role ID using case-insensitive matching
  const { data: roleData } = await supabase
    .from("roles")
    .select("id")
    .ilike("name", user.role || "")
    .single()

  if (!roleData) {
    return false
  }

  // Check if the role has the specific permission
  const { data: permData, error } = await supabase
    .from("permissions")
    .select("id")
    .eq("role_id", roleData.id)
    .eq("resource", resource)
    .eq("action", action)
    .single()

  if (error && error.code !== "PGRST116") {
    // PGRST116 is "not found" which is fine, other errors are not
    console.error("Error checking permission:", error)
    return false
  }

  return !!permData
}

/**
 * Require a specific permission, throw error if user doesn't have it
 */
export async function requirePermission(
  resource: "projects" | "tickets" | "users" | "roles" | "settings" | "assets" | "clockify",
  action: "view" | "create" | "edit" | "delete" | "manage"
) {
  const hasPerm = await hasPermission(resource, action)
  if (!hasPerm) {
    throw new Error(`Forbidden: ${action} ${resource} permission required`)
  }
  return await requireAuth()
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

