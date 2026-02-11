import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    await requirePermission("tickets", "view")
    const supabase = createServerClient()

    const payload = await request.json().catch(() => ({}))
    const displayIds = Array.isArray(payload.displayIds) ? payload.displayIds : []

    const normalizedIds = Array.from(
      new Set(
        displayIds
          .map((id: string) => String(id || "").trim().toUpperCase())
          .filter((id: string) => id.length > 0)
      )
    )

    if (normalizedIds.length === 0) {
      return NextResponse.json({ tickets: [] })
    }

    const { data, error } = await supabase
      .from("tickets")
      .select("id, display_id, title")
      .in("display_id", normalizedIds)

    if (error) {
      console.error("Error fetching tickets for reconcile:", error)
      return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 })
    }

    return NextResponse.json({ tickets: data || [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/clockify/reconcile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
