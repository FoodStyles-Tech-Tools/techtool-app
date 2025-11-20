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

    const { data: epic, error } = await supabase
      .from("epics")
      .select("*")
      .eq("id", params.id)
      .maybeSingle()

    if (error) {
      console.error("Error fetching epic:", error)
      return NextResponse.json(
        { error: "Failed to fetch epic" },
        { status: 500 }
      )
    }

    if (!epic) {
      return NextResponse.json(
        { error: "Epic not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ epic })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/epics/[id]:", error)
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
    const { name, description, color } = body

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
    if (color !== undefined) updates.color = color || "#3b82f6"

    const { data: epic, error } = await supabase
      .from("epics")
      .update(updates)
      .eq("id", params.id)
      .select("*")
      .single()

    if (error) {
      console.error("Error updating epic:", error)
      return NextResponse.json(
        { error: "Failed to update epic" },
        { status: 500 }
      )
    }

    if (!epic) {
      return NextResponse.json(
        { error: "Epic not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ epic })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in PATCH /api/epics/[id]:", error)
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

    // Check if epic exists
    const { data: epic, error: fetchError } = await supabase
      .from("epics")
      .select("id")
      .eq("id", params.id)
      .maybeSingle()

    if (fetchError) {
      console.error("Error fetching epic:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch epic" },
        { status: 500 }
      )
    }

    if (!epic) {
      return NextResponse.json(
        { error: "Epic not found" },
        { status: 404 }
      )
    }

    // Delete epic (tickets with this epic_id will have it set to null due to ON DELETE SET NULL)
    const { error: deleteError } = await supabase
      .from("epics")
      .delete()
      .eq("id", params.id)

    if (deleteError) {
      console.error("Error deleting epic:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete epic" },
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
    console.error("Error in DELETE /api/epics/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

