import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { getReportData } from "@/lib/server/report"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET: Aggregated report data for a session (volume, requesters, status, response time, lead time). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("clockify", "view")
    const { id } = await params

    const data = await getReportData(id)

    if (!data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("GET /api/report/sessions/[id]/data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
