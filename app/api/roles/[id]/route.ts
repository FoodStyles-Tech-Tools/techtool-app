import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdmin, requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("roles", "view")
    const supabase = createServerClient()

    const { data: role, error } = await supabase
      .from("roles")
      .select(`
        *,
        permissions:permissions(id, resource, action)
      `)
      .eq("id", params.id)
      .single()

    if (error || !role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ role })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/roles/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("roles", "edit")
    const supabase = createServerClient()

    const body = await request.json()
    const { name, description, permissions } = body

    // Check if it's a system role or admin role
    const { data: existingRole } = await supabase
      .from("roles")
      .select("is_system, name")
      .eq("id", params.id)
      .single()

    const isAdminRole = existingRole?.name?.toLowerCase() === "admin"

    if (isAdminRole && name && name !== existingRole.name) {
      return NextResponse.json(
        { error: "Cannot rename admin role" },
        { status: 400 }
      )
    }

    if (isAdminRole && permissions !== undefined) {
      return NextResponse.json(
        { error: "Cannot modify permissions for admin role" },
        { status: 400 }
      )
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description

    // Only update role if there are changes
    if (Object.keys(updates).length > 0) {
      const { data: role, error: roleError } = await supabase
        .from("roles")
        .update(updates)
        .eq("id", params.id)
        .select()
        .single()

      if (roleError) {
        console.error("Error updating role:", roleError)
        return NextResponse.json(
          { error: `Failed to update role: ${roleError.message || JSON.stringify(roleError)}` },
          { status: 500 }
        )
      }
    }

    // Update permissions if provided
    if (permissions !== undefined) {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from("permissions")
        .delete()
        .eq("role_id", params.id)

      if (deleteError) {
        console.error("Error deleting permissions:", deleteError)
        return NextResponse.json(
          { error: `Failed to delete existing permissions: ${deleteError.message || JSON.stringify(deleteError)}` },
          { status: 500 }
        )
      }

      // Insert new permissions
      if (Array.isArray(permissions) && permissions.length > 0) {
        // Validate and map permissions
        const validResources = ["projects", "tickets", "users", "roles", "settings", "assets", "clockify"]
        const validActions = ["view", "create", "edit", "delete", "manage"]
        
        const permissionInserts = permissions
          .filter((p: any) => {
            const isValid = validResources.includes(p.resource) && validActions.includes(p.action)
            if (!isValid) {
              console.warn(`Invalid permission: ${p.resource}:${p.action}`)
            }
            return isValid
          })
          .map((p: any) => ({
            role_id: params.id,
            resource: p.resource,
            action: p.action,
          }))

        if (permissionInserts.length > 0) {
          const { error: insertError } = await supabase
            .from("permissions")
            .insert(permissionInserts)

          if (insertError) {
            console.error("Error inserting permissions:", insertError)
            return NextResponse.json(
              { error: `Failed to insert permissions: ${insertError.message || JSON.stringify(insertError)}` },
              { status: 500 }
            )
          }
        }
      }
    }

    // Fetch updated role with permissions
    const { data: updatedRole, error: fetchError } = await supabase
      .from("roles")
      .select(`
        *,
        permissions:permissions(resource, action)
      `)
      .eq("id", params.id)
      .single()

    if (fetchError) {
      console.error("Error fetching updated role:", fetchError)
      return NextResponse.json(
        { error: `Failed to fetch updated role: ${fetchError.message || JSON.stringify(fetchError)}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ role: updatedRole })
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      )
    }
    console.error("Error in PATCH /api/roles/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("roles", "delete")
    const supabase = createServerClient()

    // Check if it's a system role or admin role
    const { data: role } = await supabase
      .from("roles")
      .select("is_system, name")
      .eq("id", params.id)
      .single()

    const isAdminRole = role?.name?.toLowerCase() === "admin"

    if (isAdminRole) {
      return NextResponse.json(
        { error: "Cannot delete admin role" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("roles")
      .delete()
      .eq("id", params.id)

    if (error) {
      console.error("Error deleting role:", error)
      return NextResponse.json(
        { error: "Failed to delete role" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      )
    }
    console.error("Error in DELETE /api/roles/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

