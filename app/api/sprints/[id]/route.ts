import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("projects", "view")
    const supabase = createServerClient()

    const { data: sprint, error } = await supabase
      .from("sprints")
      .select("*")
      .eq("id", params.id)
      .maybeSingle()

    if (error) {
      console.error("Error fetching sprint:", error)
      return NextResponse.json(
        { error: "Failed to fetch sprint" },
        { status: 500 }
      )
    }

    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ sprint })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/sprints/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("projects", "edit")
    const supabase = createServerClient()

    const body = await request.json()
    const { name, description, status, start_date, end_date } = body

    const updates: any = {}
    if (name !== undefined) {
      const trimmedName = name?.trim()
      if (!trimmedName) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        )
      }
      updates.name = trimmedName
    }
    if (description !== undefined) updates.description = description || null
    if (status !== undefined) updates.status = status
    if (start_date !== undefined) updates.start_date = start_date || null
    if (end_date !== undefined) updates.end_date = end_date || null

    const { data: sprint, error } = await supabase
      .from("sprints")
      .update(updates)
      .eq("id", params.id)
      .select("*")
      .single()

    if (error) {
      console.error("Error updating sprint:", error)
      return NextResponse.json(
        { error: "Failed to update sprint" },
        { status: 500 }
      )
    }

    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ sprint })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in PATCH /api/sprints/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("projects", "edit")
    const supabase = createServerClient()

    // Check if sprint exists
    const { data: sprint, error: fetchError } = await supabase
      .from("sprints")
      .select("id")
      .eq("id", params.id)
      .maybeSingle()

    if (fetchError) {
      console.error("Error fetching sprint:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch sprint" },
        { status: 500 }
      )
    }

    if (!sprint) {
      return NextResponse.json(
        { error: "Sprint not found" },
        { status: 404 }
      )
    }

    // Delete sprint (epics and tickets with this sprint_id will have it set to null due to ON DELETE SET NULL)
    const { error: deleteError } = await supabase
      .from("sprints")
      .delete()
      .eq("id", params.id)

    if (deleteError) {
      console.error("Error deleting sprint:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete sprint" },
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
    console.error("Error in DELETE /api/sprints/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

