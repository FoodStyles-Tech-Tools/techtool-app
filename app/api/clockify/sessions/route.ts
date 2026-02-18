import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"

const CLOCKIFY_API_URL = "https://reports.api.clockify.me/v1"
const CLOCKIFY_PAGE_SIZE = 1000
const CLOCKIFY_MAX_PAGES = 200

const formatDate = (date: Date) => date.toISOString().slice(0, 10)

const toClockifyDateTime = (dateValue: string, isEnd: boolean) => {
  const suffix = isEnd ? "T23:59:59.999Z" : "T00:00:00.000Z"
  return new Date(`${dateValue}${suffix}`).toISOString()
}

const getLastFullWeekRange = () => {
  const now = new Date()
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayOfWeek = utcToday.getUTCDay()
  const daysSinceMonday = (dayOfWeek + 6) % 7

  const mondayThisWeek = new Date(utcToday)
  mondayThisWeek.setUTCDate(utcToday.getUTCDate() - daysSinceMonday)

  const lastWeekStart = new Date(mondayThisWeek)
  lastWeekStart.setUTCDate(mondayThisWeek.getUTCDate() - 7)

  const lastWeekEnd = new Date(lastWeekStart)
  lastWeekEnd.setUTCDate(lastWeekStart.getUTCDate() + 6)

  return {
    startDate: formatDate(lastWeekStart),
    endDate: formatDate(lastWeekEnd),
  }
}

const getUserId = async (supabase: ReturnType<typeof createServerClient>, email: string) => {
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single()

  return user?.id || null
}

const extractEntries = (reportData: any) => {
  if (Array.isArray(reportData?.timeentries)) return reportData.timeentries
  if (Array.isArray(reportData?.timeEntries)) return reportData.timeEntries
  return []
}

const assignEntries = (reportData: any, entries: any[]) => {
  if (!reportData || typeof reportData !== "object") {
    return { timeentries: entries }
  }
  if (Array.isArray(reportData.timeentries)) {
    return { ...reportData, timeentries: entries }
  }
  if (Array.isArray(reportData.timeEntries)) {
    return { ...reportData, timeEntries: entries }
  }
  return { ...reportData, timeentries: entries }
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission("clockify", "view")
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const start = searchParams.get("start")
    const end = searchParams.get("end")
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Math.min(parseInt(limitParam), 500) : null

    let query = supabase
      .from("clockify_report_sessions")
      .select("*")
      .order("fetched_at", { ascending: false })

    if (start) {
      query = query.eq("start_date", start)
    }

    if (end) {
      query = query.eq("end_date", end)
    }

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching Clockify sessions:", error)
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    return NextResponse.json({ sessions: data || [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/clockify/sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const supabase = createServerClient()

    const payload = await request.json().catch(() => ({}))
    let { startDate, endDate, clearSessions } = payload as {
      startDate?: string
      endDate?: string
      clearSessions?: boolean
    }

    if (!startDate || !endDate) {
      const defaultRange = getLastFullWeekRange()
      startDate = startDate || defaultRange.startDate
      endDate = endDate || defaultRange.endDate
    }

    const clockifyApiKey = process.env.CLOCKIFY_API_KEY
    const clockifyWorkspaceId = process.env.CLOCKIFY_WORKSPACE_ID

    if (!clockifyApiKey || !clockifyWorkspaceId) {
      return NextResponse.json(
        { error: "Clockify environment variables are not configured" },
        { status: 500 }
      )
    }

    const requesterId = await getUserId(supabase, session.user.email)
    if (!requesterId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let reportData: any = null
    let status = "success"
    let errorMessage: string | null = null

    try {
      const allEntries: any[] = []
      let baseReport: any = null
      let totalPages: number | null = null

      for (let page = 1; page <= CLOCKIFY_MAX_PAGES; page += 1) {
        const requestBody = {
          dateRangeStart: toClockifyDateTime(startDate, false),
          dateRangeEnd: toClockifyDateTime(endDate, true),
          detailedFilter: {
            page,
            pageSize: CLOCKIFY_PAGE_SIZE,
          },
        }

        const response = await fetch(
          `${CLOCKIFY_API_URL}/workspaces/${clockifyWorkspaceId}/reports/detailed`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": clockifyApiKey,
            },
            body: JSON.stringify(requestBody),
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          status = "failed"
          errorMessage = errorText || "Clockify API error"
          break
        }

        const pageReport = await response.json()
        if (!baseReport) {
          baseReport = pageReport
        }

        const pageEntries = extractEntries(pageReport)
        if (pageEntries.length > 0) {
          allEntries.push(...pageEntries)
        }

        if (typeof pageReport?.paging?.totalPages === "number") {
          totalPages = pageReport.paging.totalPages
        } else if (typeof pageReport?.totals?.totalPages === "number") {
          totalPages = pageReport.totals.totalPages
        }

        if (totalPages && page >= totalPages) {
          break
        }

        if (pageEntries.length < CLOCKIFY_PAGE_SIZE) {
          break
        }
      }

      if (status === "success") {
        // Persist the full weekly dataset from Clockify.
        // Filtering for TechTool is handled in the Clockify Report Session UI.
        reportData = assignEntries(baseReport, allEntries)
      }
    } catch (error: any) {
      status = "failed"
      errorMessage = error?.message || "Clockify request failed"
    }

    if (clearSessions && status === "success") {
      await requirePermission("clockify", "manage")
      const { error: deleteError } = await supabase
        .from("clockify_report_sessions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")

      if (deleteError) {
        console.error("Error clearing Clockify sessions:", deleteError)
        return NextResponse.json(
          { error: "Failed to clear Clockify sessions" },
          { status: 500 }
        )
      }
    }

    const { data: reportSession, error } = await supabase
      .from("clockify_report_sessions")
      .insert({
        start_date: startDate,
        end_date: endDate,
        status,
        error_message: errorMessage,
        report_data: reportData,
        requested_by_id: requesterId,
      })
      .select("*")
      .single()

    if (error) {
      console.error("Error saving Clockify session:", error)
      return NextResponse.json(
        { error: "Failed to save Clockify session" },
        { status: 500 }
      )
    }

    if (status !== "success") {
      return NextResponse.json(
        { error: errorMessage || "Clockify report failed", session: reportSession },
        { status: 502 }
      )
    }

    return NextResponse.json({ session: reportSession })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/clockify/sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requirePermission("clockify", "manage")
    const supabase = createServerClient()

    const payload = await request.json().catch(() => ({}))
    const { sessionId, reconciliation } = payload as {
      sessionId?: string
      reconciliation?: Record<
        string,
        { ticketDisplayId?: string; status?: string; ticketId?: string }
      >
    }

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }

    const { data: existing, error: fetchError } = await supabase
      .from("clockify_report_sessions")
      .select("id, report_data")
      .eq("id", sessionId)
      .single()

    if (fetchError || !existing) {
      console.error("Error fetching Clockify session:", fetchError)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const reportData = existing.report_data || {}
    const entries = Array.isArray(reportData.timeentries)
      ? reportData.timeentries
      : Array.isArray(reportData.timeEntries)
        ? reportData.timeEntries
        : []

    const reconcileMap = reconciliation || {}
    const updatedEntries = entries.map((entry: any) => {
      const entryId = entry?.id || entry?._id || entry?.timeEntryId
      if (!entryId || !reconcileMap[entryId]) return entry
      const { ticketDisplayId, status, ticketId } = reconcileMap[entryId]
      return {
        ...entry,
        reconcileTicketDisplayId: ticketDisplayId || "",
        reconcileTicketId: ticketId || "",
        reconcileStatus: status || "",
      }
    })

    const updatedReportData = Array.isArray(reportData.timeentries)
      ? { ...reportData, timeentries: updatedEntries }
      : Array.isArray(reportData.timeEntries)
        ? { ...reportData, timeEntries: updatedEntries }
        : { ...reportData, timeentries: updatedEntries }

    const { data: updated, error: updateError } = await supabase
      .from("clockify_report_sessions")
      .update({ report_data: updatedReportData, reconciliation: reconciliation || {} })
      .eq("id", sessionId)
      .select("*")
      .single()

    if (updateError) {
      console.error("Error updating Clockify session:", updateError)
      return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
    }

    return NextResponse.json({ session: updated })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in PATCH /api/clockify/sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requirePermission("clockify", "manage")
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("clockify_report_sessions")
      .delete()
      .eq("id", sessionId)

    if (error) {
      console.error("Error deleting Clockify session:", error)
      return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in DELETE /api/clockify/sessions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
