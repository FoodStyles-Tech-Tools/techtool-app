import { NextRequest, NextResponse } from "@/backend/compat/server"
import { getRequestContext } from "@/lib/auth-helpers"
import { getOrSetServerCache } from "@/lib/server/cache"
import { fetchTicketDetailPayload } from "@/lib/server/ticket-detail"
import { getTicketCacheVersion } from "@/lib/server/ticket-cache"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
      requireUserContext: false,
    })

    const { searchParams } = new URL(request.url)
    const view = searchParams.get("view") || "detail"
    if (view !== "detail") {
      return NextResponse.json(
        { error: "Unsupported view. Use view=detail." },
        { status: 400 }
      )
    }

    const cacheVersion = await getTicketCacheVersion()
    const payload = await getOrSetServerCache(
      `v2:ticket:${cacheVersion}:${userId}:${params.id}`,
      30,
      async () => fetchTicketDetailPayload(supabase, params.id)
    )

    if ("status" in payload && payload.status === 500) {
      return NextResponse.json({ error: payload.error || "Internal server error" }, { status: 500 })
    }

    if (("status" in payload && payload.status === 404) || !payload.ticket) {
      return NextResponse.json({ error: payload.error || "Ticket not found" }, { status: 404 })
    }

    return NextResponse.json(payload)
  } catch (error: any) {
    if (error.message === "Ticket not found") {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/v2/tickets/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


