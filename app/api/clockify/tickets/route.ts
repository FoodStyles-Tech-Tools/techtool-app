import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    await requirePermission("tickets", "view")
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("q") || "").trim()
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 25)

    let searchQuery = supabase
      .from("tickets")
      .select("id, display_id, title")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (query) {
      searchQuery = searchQuery.ilike("display_id", `%${query}%`)
    }

    const { data, error } = await searchQuery

    if (error) {
      console.error("Error searching tickets:", error)
      return NextResponse.json({ error: "Failed to search tickets" }, { status: 500 })
    }

    return NextResponse.json({ tickets: data || [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/clockify/tickets:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
