import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

const DEFAULT_SCHEDULE = "weekly"

export async function GET() {
  try {
    await requirePermission("clockify", "view")
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from("clockify_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("Error fetching Clockify settings:", error)
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }

    if (data) {
      return NextResponse.json({ settings: data })
    }

    const { data: created, error: createError } = await supabase
      .from("clockify_settings")
      .insert({ schedule: DEFAULT_SCHEDULE })
      .select("*")
      .single()

    if (createError) {
      console.error("Error creating Clockify settings:", createError)
      return NextResponse.json({ error: "Failed to create settings" }, { status: 500 })
    }

    return NextResponse.json({ settings: created })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/clockify/settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requirePermission("clockify", "manage")
    const supabase = createServerClient()

    const payload = await request.json().catch(() => ({}))
    const schedule = payload.schedule || DEFAULT_SCHEDULE

    const { data: existing, error: fetchError } = await supabase
      .from("clockify_settings")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error("Error fetching Clockify settings:", fetchError)
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }

    if (existing?.id) {
      const { data: updated, error: updateError } = await supabase
        .from("clockify_settings")
        .update({ schedule })
        .eq("id", existing.id)
        .select("*")
        .single()

      if (updateError) {
        console.error("Error updating Clockify settings:", updateError)
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
      }

      return NextResponse.json({ settings: updated })
    }

    const { data: created, error: createError } = await supabase
      .from("clockify_settings")
      .insert({ schedule })
      .select("*")
      .single()

    if (createError) {
      console.error("Error creating Clockify settings:", createError)
      return NextResponse.json({ error: "Failed to create settings" }, { status: 500 })
    }

    return NextResponse.json({ settings: created })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in PATCH /api/clockify/settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
