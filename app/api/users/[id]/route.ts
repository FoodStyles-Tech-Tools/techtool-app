import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdmin, requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("users", "edit")
    const supabase = createServerClient()

    const body = await request.json()
    const { name, role, email } = body

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (role !== undefined) {
      // Validate role exists in roles table (case-insensitive)
      const { data: roleExists } = await supabase
        .from("roles")
        .select("id")
        .ilike("name", role || "")
        .single()

      if (!roleExists) {
        return NextResponse.json(
          { error: "Invalid role. Role must exist in the roles table." },
          { status: 400 }
        )
      }
      updates.role = role
    }
    if (email !== undefined) updates.email = email

    const { data: user, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating user:", error)
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      )
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in PATCH /api/users/[id]:", error)
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
    await requirePermission("users", "delete")
    const supabase = createServerClient()

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", params.id)

    if (error) {
      console.error("Error deleting user:", error)
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in DELETE /api/users/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

