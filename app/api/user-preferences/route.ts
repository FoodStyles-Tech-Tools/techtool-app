import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserWithSupabase } from "@/lib/current-user"

export const runtime = 'nodejs'
export const dynamic = "force-dynamic"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET() {
  try {
    const { supabase, user } = await getCurrentUserWithSupabase()

    // Get user preferences, or return defaults if not found
    const { data: preferences, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error("Error fetching user preferences:", error)
      return NextResponse.json(
        { error: "Failed to fetch user preferences" },
        { status: 500 }
      )
    }

    const normalizedPreferences = preferences
      ? {
          ...preferences,
          pinned_project_ids: Array.isArray((preferences as any).pinned_project_ids)
            ? (preferences as any).pinned_project_ids
            : [],
        }
      : {
          user_id: user.id,
          group_by_epic: false,
          tickets_view: "table",
          pinned_project_ids: [],
        }

    // Return preferences or defaults
    return NextResponse.json({ preferences: normalizedPreferences })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error in GET /api/user-preferences:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await getCurrentUserWithSupabase()
    const body = await request.json()
    const { group_by_epic, tickets_view, pinned_project_ids } = body
    const normalizedPinnedProjectIds =
      pinned_project_ids === undefined
        ? undefined
        : Array.from(
            new Set(
              (Array.isArray(pinned_project_ids) ? pinned_project_ids : [])
                .filter((id): id is string => typeof id === "string" && UUID_PATTERN.test(id))
            )
          )

    // Check if preferences exist
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", user.id)
      .single()

    let result
    if (existing) {
      // Update existing preferences
      const updates: any = {}
      if (group_by_epic !== undefined) updates.group_by_epic = group_by_epic
      if (tickets_view !== undefined) updates.tickets_view = tickets_view
      if (normalizedPinnedProjectIds !== undefined) {
        updates.pinned_project_ids = normalizedPinnedProjectIds
      }

      const { data, error } = await supabase
        .from("user_preferences")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating user preferences:", error)
        return NextResponse.json(
          { error: "Failed to update user preferences" },
          { status: 500 }
        )
      }
      result = data
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from("user_preferences")
        .insert({
          user_id: user.id,
          group_by_epic: group_by_epic ?? false,
          tickets_view: tickets_view ?? "table",
          pinned_project_ids: normalizedPinnedProjectIds ?? [],
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating user preferences:", error)
        return NextResponse.json(
          { error: "Failed to create user preferences" },
          { status: 500 }
        )
      }
      result = data
    }

    return NextResponse.json({ preferences: result })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error in PATCH /api/user-preferences:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
