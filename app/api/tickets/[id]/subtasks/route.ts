import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("tickets", "view")
    const supabase = createServerClient()

    const { data: subtasks, error } = await supabase
      .from("subtasks")
      .select("*")
      .eq("ticket_id", params.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching subtasks:", error)
      return NextResponse.json(
        { error: "Failed to fetch subtasks" },
        { status: 500 }
      )
    }

    return NextResponse.json({ subtasks: subtasks || [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/tickets/[id]/subtasks:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("tickets", "edit")
    const supabase = createServerClient()

    const body = await request.json()
    const { title } = body

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    // Get the highest position for this ticket
    const { data: lastSubtask } = await supabase
      .from("subtasks")
      .select("position")
      .eq("ticket_id", params.id)
      .order("position", { ascending: false })
      .single()

    const nextPosition = lastSubtask ? (lastSubtask.position || 0) + 1 : 0

    const { data: subtask, error } = await supabase
      .from("subtasks")
      .insert({
        ticket_id: params.id,
        title: title.trim(),
        position: nextPosition,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating subtask:", error)
      return NextResponse.json(
        { error: "Failed to create subtask" },
        { status: 500 }
      )
    }

    return NextResponse.json({ subtask }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/tickets/[id]/subtasks:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


