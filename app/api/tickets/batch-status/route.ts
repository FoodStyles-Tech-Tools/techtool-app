import { NextRequest, NextResponse } from "@/backend/compat/server"
import { getRequestContext } from "@/lib/auth-helpers"
import { buildStatusChangeBody } from "@/lib/ticket-statuses"
import { invalidateTicketCaches } from "@/lib/server/ticket-cache"

export const runtime = "nodejs"

type BatchStatusBody = {
  ticketIds?: unknown
  status?: unknown
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })

    const body = (await request.json()) as BatchStatusBody
    const ticketIds = Array.isArray(body.ticketIds)
      ? Array.from(
          new Set(
            body.ticketIds
              .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
              .map((value) => value.trim())
          )
        )
      : []
    const status = typeof body.status === "string" ? body.status.trim() : ""

    if (!ticketIds.length) {
      return NextResponse.json({ error: "ticketIds is required" }, { status: 400 })
    }

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 })
    }

    const { data: currentTickets, error: fetchError } = await supabase
      .from("tickets")
      .select("id, status, started_at")
      .in("id", ticketIds)

    if (fetchError) {
      console.error("Error fetching tickets for batch status update:", fetchError)
      return NextResponse.json({ error: "Failed to load tickets" }, { status: 500 })
    }

    if (!currentTickets?.length) {
      return NextResponse.json({ error: "Tickets not found" }, { status: 404 })
    }

    const updates = currentTickets.map((ticket) =>
      supabase
        .from("tickets")
        .update({
          status,
          ...buildStatusChangeBody(ticket.status || "open", status, {
            startedAt: ticket.started_at ?? null,
          }),
          activity_actor_id: userId,
        })
        .eq("id", ticket.id)
    )

    const results = await Promise.all(updates)
    const failedUpdate = results.find((result) => result.error)
    if (failedUpdate?.error) {
      console.error("Error updating tickets in batch status route:", failedUpdate.error)
      return NextResponse.json({ error: "Failed to update tickets" }, { status: 500 })
    }

    await invalidateTicketCaches()

    return NextResponse.json({
      updatedCount: currentTickets.length,
      ticketIds: currentTickets.map((ticket) => ticket.id),
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/tickets/batch-status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


