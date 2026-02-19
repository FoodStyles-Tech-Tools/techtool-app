import { NextRequest, NextResponse } from "next/server"
import { getSupabaseWithUserContext, requirePermission } from "@/lib/auth-helpers"

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("tickets", "edit")
    const { supabase } = await getSupabaseWithUserContext()

    const body = await request.json()
    const { positions } = body

    if (!positions || !Array.isArray(positions)) {
      return NextResponse.json(
        { error: "Positions array is required" },
        { status: 400 }
      )
    }

    // Update all positions in a transaction-like manner
    const updates = positions.map(({ id, position }: { id: string; position: number }) =>
      supabase
        .from("subtasks")
        .update({ position })
        .eq("id", id)
        .eq("ticket_id", params.id)
    )

    const results = await Promise.all(updates)
    const errors = results.filter((result) => result.error)

    if (errors.length > 0) {
      console.error("Error updating subtask positions:", errors)
      return NextResponse.json(
        { error: "Failed to update subtask positions" },
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
    console.error("Error in PATCH /api/tickets/[id]/subtasks/reorder:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
