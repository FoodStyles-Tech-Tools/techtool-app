import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    await requirePermission("tickets", "view")
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const rawIds = searchParams.get("ids")
    const parentTicketIds = rawIds
      ? rawIds
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : []

    if (parentTicketIds.length === 0) {
      return NextResponse.json({ counts: {} })
    }

    const { data, error } = await supabase
      .from("tickets")
      .select("parent_ticket_id")
      .eq("type", "subtask")
      .in("parent_ticket_id", parentTicketIds)

    if (error) {
      console.error("Error fetching subtask counts:", error)
      return NextResponse.json(
        { error: "Failed to fetch subtask counts" },
        { status: 500 }
      )
    }

    const counts: Record<string, number> = {}
    ;(data || []).forEach((row: { parent_ticket_id: string | null }) => {
      if (!row.parent_ticket_id) return
      counts[row.parent_ticket_id] = (counts[row.parent_ticket_id] || 0) + 1
    })

    return NextResponse.json({ counts })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/tickets/subtask-counts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
