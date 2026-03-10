import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = 'nodejs'

function normalizeDiscordId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const mentionMatch = trimmed.match(/^<@!?(\d+)>$/)
  return mentionMatch ? mentionMatch[1] : trimmed
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("users", "view")
    const supabase = createServerClient()

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, avatar_url, discord_id, role, created_at")
      .eq("id", params.id)
      .maybeSingle()

    if (error) {
      console.error("Error fetching user:", error)
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.avatar_url || null,
        discord_id: user.discord_id,
        role: user.role,
        created_at: user.created_at,
      },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/users/[id]:", error)
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
    await requirePermission("users", "edit")
    const supabase = createServerClient()

    const body = await request.json()
    const { name, role, email, discord_id } = body

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
    if (discord_id !== undefined) updates.discord_id = normalizeDiscordId(discord_id)

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
  _request: NextRequest,
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
