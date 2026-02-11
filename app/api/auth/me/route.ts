import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user details from Supabase users table
    const { supabase } = await import("@/lib/supabase")
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", session.user.email)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Get image from auth_user
    const { data: authUser } = await supabase
      .from("auth_user")
      .select("image")
      .eq("email", user.email)
      .single()

    // Get user permissions
    let permissions: Array<{ resource: string; action: string }> = []
    
    // Admin role has all permissions (case-insensitive check)
    if (user.role?.toLowerCase() === "admin") {
      const allResources = ["projects", "tickets", "users", "roles", "settings", "assets", "clockify", "status"]
      const allActions = ["view", "create", "edit", "delete", "manage"]
      permissions = allResources.flatMap((resource) =>
        allActions.map((action) => ({ resource, action }))
      )
    } else {
      // Get permissions from database using case-insensitive matching
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

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: authUser?.image || null,
        role: user.role,
        permissions,
      },
      session,
    })
  } catch (error) {
    console.error("Error getting session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

