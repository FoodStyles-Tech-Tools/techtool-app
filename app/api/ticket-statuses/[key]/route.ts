import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    await requirePermission("status", "manage")
    const supabase = createServerClient()
    const body = await request.json()
    const { label, color, sort_order } = body || {}

    const updates: Record<string, any> = {}

    if (typeof label === "string") {
      const trimmedLabel = label.trim()
      if (!trimmedLabel) {
        return NextResponse.json({ error: "Label cannot be empty" }, { status: 400 })
      }
      updates.label = trimmedLabel
    }

    if (typeof color === "string") {
      const trimmedColor = color.trim()
      const normalizedColor = trimmedColor.startsWith("#")
        ? trimmedColor
        : `#${trimmedColor}`
      const colorRegex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/
      if (!colorRegex.test(normalizedColor)) {
        return NextResponse.json({ error: "Invalid color value" }, { status: 400 })
      }
      updates.color = normalizedColor
    }

    if (sort_order !== undefined) {
      const parsedSortOrder = Number(sort_order)
      updates.sort_order = Number.isFinite(parsedSortOrder) ? parsedSortOrder : 0
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    const { data: status, error } = await supabase
      .from("ticket_statuses")
      .update(updates)
      .eq("key", params.key)
      .select("key, label, sort_order, color, created_at, updated_at")
      .single()

    if (error) {
      console.error("Error updating ticket status:", error)
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
    }

    return NextResponse.json({ status })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in PATCH /api/ticket-statuses/[key]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    await requirePermission("status", "manage")
    const supabase = createServerClient()

    const { error } = await supabase
      .from("ticket_statuses")
      .delete()
      .eq("key", params.key)

    if (error) {
      console.error("Error deleting ticket status:", error)
      const message =
        error.code === "23503"
          ? "Cannot delete a status that is in use by tickets"
          : "Failed to delete status"
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in DELETE /api/ticket-statuses/[key]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
