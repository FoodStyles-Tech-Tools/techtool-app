import { NextRequest, NextResponse } from "next/server"
import { getRequestContext } from "@/lib/auth-helpers"
import { fetchTicketDetailPayload } from "@/lib/server/ticket-detail"

export const runtime = "nodejs"

/** GET /api/tickets/[id]/detail - deprecated; use /api/v2/tickets/[id]?view=detail */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
    })

    const payload = await fetchTicketDetailPayload(supabase, params.id)
    if (payload.status === 500) {
      return NextResponse.json(
        { error: payload.error || "Failed to fetch ticket" },
        { status: 500 }
      )
    }

    if (payload.status === 404 || !payload.ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    return NextResponse.json(payload, {
      headers: {
        "X-Techtool-Deprecated": "Use /api/v2/tickets/[id]?view=detail",
      },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/tickets/[id]/detail:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
