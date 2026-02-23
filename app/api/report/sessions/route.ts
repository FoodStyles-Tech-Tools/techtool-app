import { NextRequest, NextResponse } from "next/server"
import { requirePermission, getSupabaseWithUserContext } from "@/lib/auth-helpers"
import { getDefaultReportDateRange } from "@/lib/report-date-range"
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

/** GET: List report sessions for the current user. */
export async function GET() {
  try {
    await requirePermission("clockify", "view")
    const { supabase } = await getSupabaseWithUserContext()

    const { data, error } = await supabase
      .from("report_sessions")
      .select("*")
      .order("updated_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(
      (data ?? []).map(toSession)
    )
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("GET /api/report/sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** POST: Create a new report session (default 5 completed weeks). */
export async function POST(request: NextRequest) {
  try {
    await requirePermission("clockify", "view")
    const { supabase, userId } = await getSupabaseWithUserContext()

    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === "string" ? body.name.trim() || null : null

    const { start: defaultStart, end: defaultEnd } = getDefaultReportDateRange()
    let date_range_start = defaultStart.toISOString()
    let date_range_end = defaultEnd.toISOString()
    const hasCustomStart = typeof body.date_range_start === "string"
    const hasCustomEnd = typeof body.date_range_end === "string"
    if (hasCustomStart !== hasCustomEnd) {
      return NextResponse.json({ error: "Both date_range_start and date_range_end are required" }, { status: 400 })
    }
    if (hasCustomStart && hasCustomEnd) {
      const parsedStart = new Date(body.date_range_start)
      const parsedEnd = new Date(body.date_range_end)
      if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
        return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
      }
      if (parsedStart.getTime() > parsedEnd.getTime()) {
        return NextResponse.json({ error: "date_range_start must be <= date_range_end" }, { status: 400 })
      }
      date_range_start = parsedStart.toISOString()
      date_range_end = parsedEnd.toISOString()
    }

    const filters: ReportSessionFilters = {}
    if (body.filters && typeof body.filters === "object") {
      if (body.filters.projectId != null) filters.projectId = body.filters.projectId
      if (body.filters.assigneeId != null) filters.assigneeId = body.filters.assigneeId
      if (body.filters.departmentId != null) filters.departmentId = body.filters.departmentId
      if (body.filters.requestedById != null) filters.requestedById = body.filters.requestedById
      if (body.filters.status != null) filters.status = body.filters.status
    }

    const { data, error } = await supabase
      .from("report_sessions")
      .insert({
        created_by_id: userId,
        name,
        date_range_start,
        date_range_end,
        filters,
        insights: null,
      })
      .select("*")
      .single()

    if (error) throw error

    return NextResponse.json(toSession(data))
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("POST /api/report/sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
