import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdmin, requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    await requirePermission("roles", "view")
    const supabase = createServerClient()

    const { data: roles, error } = await supabase
      .from("roles")
      .select(`
        *,
        permissions:permissions(resource, action)
      `)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching roles:", error)
      return NextResponse.json(
        { error: "Failed to fetch roles" },
        { status: 500 }
      )
    }

    return NextResponse.json({ roles: roles || [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/roles:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission("roles", "create")
    const supabase = createServerClient()

    const body = await request.json()
    const { name, description, permissions } = body

    if (!name) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      )
    }

    // Create role
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .insert({
        name,
        description: description || null,
        is_system: false,
      })
      .select()
      .single()

    if (roleError) {
      console.error("Error creating role:", roleError)
      return NextResponse.json(
        { error: "Failed to create role" },
        { status: 500 }
      )
    }

    // Add permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const permissionInserts = permissions.map((p: any) => ({
        role_id: role.id,
        resource: p.resource,
        action: p.action,
      }))

      const { error: permError } = await supabase
        .from("permissions")
        .insert(permissionInserts)

      if (permError) {
        console.error("Error creating permissions:", permError)
        // Continue anyway, permissions can be added later
      }
    }

    return NextResponse.json({ role }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      )
    }
    console.error("Error in POST /api/roles:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

