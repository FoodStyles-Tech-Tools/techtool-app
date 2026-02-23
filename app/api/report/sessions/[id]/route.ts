import { NextRequest, NextResponse } from "next/server"
import { requirePermission, getSupabaseWithUserContext } from "@/lib/auth-helpers"
import type { ReportSession, ReportSessionFilters } from "@/types/api/report"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function toSession(row: any): ReportSession {
  return {
    id: row.id,
    created_by_id: row.created_by_id,
    name: row.name,
    date_range_start: row.date_range_start,
    date_range_end: row.date_range_end,
    filters: (row.filters ?? {}) as ReportSessionFilters,
    insights: row.insights,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/** GET: Fetch one report session. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("clockify", "view")
    const { supabase } = await getSupabaseWithUserContext()
    const { id } = await params

    const { data, error } = await supabase
      .from("report_sessions")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(toSession(data))
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("GET /api/report/sessions/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** PATCH: Update report session (name, date range, filters, insights). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("clockify", "view")
    const { supabase } = await getSupabaseWithUserContext()
    const { id } = await params

    const body = await request.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      updates.name = typeof body.name === "string" ? body.name.trim() || null : null
    }
    if (Object.prototype.hasOwnProperty.call(body, "date_range_start") && typeof body.date_range_start === "string") {
      updates.date_range_start = body.date_range_start
    }
    if (Object.prototype.hasOwnProperty.call(body, "date_range_end") && typeof body.date_range_end === "string") {
      updates.date_range_end = body.date_range_end
    }
    if (Object.prototype.hasOwnProperty.call(body, "filters") && body.filters && typeof body.filters === "object") {
      const f: ReportSessionFilters = {}
      if (body.filters.projectId != null) f.projectId = body.filters.projectId
      if (body.filters.assigneeId != null) f.assigneeId = body.filters.assigneeId
      if (body.filters.departmentId != null) f.departmentId = body.filters.departmentId
      if (body.filters.requestedById != null) f.requestedById = body.filters.requestedById
      if (body.filters.status != null) f.status = body.filters.status
      updates.filters = f
    }
    if (Object.prototype.hasOwnProperty.call(body, "insights")) {
      updates.insights = typeof body.insights === "string" ? body.insights : null
    }

    if (Object.keys(updates).length === 0) {
      const { data: existing } = await supabase
        .from("report_sessions")
        .select("*")
        .eq("id", id)
        .single()
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      return NextResponse.json(toSession(existing))
    }

    const { data, error } = await supabase
      .from("report_sessions")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(toSession(data))
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("PATCH /api/report/sessions/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** DELETE: Remove report session. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("clockify", "view")
    const { supabase } = await getSupabaseWithUserContext()
    const { id } = await params

    const { error } = await supabase
      .from("report_sessions")
      .delete()
      .eq("id", id)

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("DELETE /api/report/sessions/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
