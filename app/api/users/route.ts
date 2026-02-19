import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdmin, requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = 'nodejs'

function normalizeDiscordId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  // Support pasting mentions like <@123...> or <@!123...>
  const mentionMatch = trimmed.match(/^<@!?(\d+)>$/)
  return mentionMatch ? mentionMatch[1] : trimmed
}

export async function GET() {
  try {
    await requirePermission("users", "view")
    const supabase = createServerClient()

    const { data: users, error } = await supabase
      .from("users")
      .select("id, name, email, discord_id, role, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ users: [] })
    }

    // Get images from auth_user for all users
    const emails = users.map(u => u.email)
    const { data: authUsers } = await supabase
      .from("auth_user")
      .select("email, image")
      .in("email", emails)
    
    // Create a map of email -> image
    const imageMap = new Map<string, string | null>()
    authUsers?.forEach(au => {
      imageMap.set(au.email, au.image || null)
    })
    
    // Map users to include image from auth_user
    const usersWithImage = users.map((user) => ({
      ...user,
      image: imageMap.get(user.email) || null,
    }))

    return NextResponse.json({ users: usersWithImage })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission("users", "create")
    const supabase = createServerClient()

    const body = await request.json()
    const { email, name, role = "member", discord_id } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

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

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Create user
    const { data: user, error } = await supabase
      .from("users")
      .insert({
        email,
        name: name || null,
        discord_id: normalizeDiscordId(discord_id),
        role,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating user:", error)
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      )
    }

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
