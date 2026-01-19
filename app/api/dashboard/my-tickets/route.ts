import { NextResponse } from "next/server"
import { getCurrentUserWithSupabase } from "@/lib/current-user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { supabase, user } = await getCurrentUserWithSupabase()
    const { data, error } = await supabase
      .from("tickets")
      .select(`
        id,
        display_id,
        title,
        status,
        priority,
        created_at,
        project:projects(id, name)
      `)
      .eq("assignee_id", user.id)
      .not("status", "in", "(completed,cancelled)")
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Failed to load assigned tickets:", error)
      return NextResponse.json({ error: "Failed to load tickets" }, { status: 500 })
    }

    return NextResponse.json({ tickets: data || [] })
  } catch (error: any) {
    if (error.message === "User record not found" || error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error("Assigned tickets API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
