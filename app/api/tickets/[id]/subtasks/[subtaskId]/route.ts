import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; subtaskId: string } }
) {
  try {
    await requirePermission("tickets", "edit")
    const supabase = createServerClient()

    const body = await request.json()
    const { title, completed } = body

    const updates: any = {}
    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        )
      }
      updates.title = title.trim()
    }
    if (completed !== undefined) {
      updates.completed = completed
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      )
    }

    const { data: subtask, error } = await supabase
      .from("subtasks")
      .update(updates)
      .eq("id", params.subtaskId)
      .eq("ticket_id", params.id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Subtask not found" },
          { status: 404 }
        )
      }
      console.error("Error updating subtask:", error)
      return NextResponse.json(
        { error: "Failed to update subtask" },
        { status: 500 }
      )
    }

    return NextResponse.json({ subtask })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in PATCH /api/tickets/[id]/subtasks/[subtaskId]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; subtaskId: string } }
) {
  try {
    await requirePermission("tickets", "edit")
    const supabase = createServerClient()

    const { error } = await supabase
      .from("subtasks")
      .delete()
      .eq("id", params.subtaskId)
      .eq("ticket_id", params.id)

    if (error) {
      console.error("Error deleting subtask:", error)
      return NextResponse.json(
        { error: "Failed to delete subtask" },
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
    console.error("Error in DELETE /api/tickets/[id]/subtasks/[subtaskId]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


