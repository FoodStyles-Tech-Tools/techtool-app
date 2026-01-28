import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    await requirePermission("status", "manage")
    const supabase = createServerClient()
    const body = await request.json()
    const order = Array.isArray(body?.order) ? body.order : []

    if (!order.length || !order.every((key: any) => typeof key === "string" && key.trim())) {
      return NextResponse.json({ error: "Invalid order payload" }, { status: 400 })
    }

    const updates = order.map((key: string, index: number) =>
      supabase
        .from("ticket_statuses")
        .update({ sort_order: index + 1 })
        .eq("key", key)
    )

    const results = await Promise.all(updates)
    const failed = results.find((result) => result.error)

    if (failed?.error) {
      console.error("Error reordering ticket statuses:", failed.error)
      return NextResponse.json({ error: "Failed to reorder statuses" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/ticket-statuses/reorder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
