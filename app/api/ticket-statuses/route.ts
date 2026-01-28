import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"
import { normalizeStatusKey } from "@/lib/ticket-statuses"

export const runtime = "nodejs"

export async function GET() {
  try {
    await requirePermission("tickets", "view")
    const supabase = createServerClient()

    const { data: statuses, error } = await supabase
      .from("ticket_statuses")
      .select("key, label, sort_order, color, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true })

    if (error) {
      console.error("Error fetching ticket statuses:", error)
      return NextResponse.json(
        { error: "Failed to fetch ticket statuses" },
        { status: 500 }
      )
    }

    return NextResponse.json({ statuses: statuses || [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/ticket-statuses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission("status", "manage")
    const supabase = createServerClient()
    const body = await request.json()
    const { key, label, color, sort_order } = body || {}

    const trimmedLabel = typeof label === "string" ? label.trim() : ""
    const normalizedKey = normalizeStatusKey(String(key || trimmedLabel || ""))
    const normalizedColor =
      typeof color === "string" && color.trim()
        ? color.trim().startsWith("#")
          ? color.trim()
          : `#${color.trim()}`
        : "#9ca3af"
    const colorRegex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/

    if (!trimmedLabel) {
      return NextResponse.json({ error: "Label is required" }, { status: 400 })
    }
    if (!normalizedKey) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 })
    }
    if (!colorRegex.test(normalizedColor)) {
      return NextResponse.json({ error: "Invalid color value" }, { status: 400 })
    }

    const sortOrder = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0

    const { data: status, error } = await supabase
      .from("ticket_statuses")
      .insert({
        key: normalizedKey,
        label: trimmedLabel,
        color: normalizedColor,
        sort_order: sortOrder,
      })
      .select("key, label, sort_order, color, created_at, updated_at")
      .single()

    if (error) {
      console.error("Error creating ticket status:", error)
      const message =
        error.code === "23505"
          ? "A status with this key already exists"
          : "Failed to create status"
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({ status }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/ticket-statuses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
