import { NextRequest, NextResponse } from "@/backend/compat/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: { displayId: string } }
) {
  try {
    await requirePermission("tickets", "view")
    const supabase = createServerClient()

    // Normalize display_id to uppercase (display_ids are stored as HRB-XXXX)
    const normalizedDisplayId = params.displayId.toUpperCase()

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select(`
        *,
        project:projects(id, name, description, require_sqa),
        assignee:users!tickets_assignee_id_fkey(id, name, email, avatar_url),
        sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email, avatar_url),
        requested_by:users!tickets_requested_by_id_fkey(id, name, email, avatar_url),
        department:departments(id, name),
        epic:epics(id, name, color)
      `)
      .eq("display_id", normalizedDisplayId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching ticket by display_id:", error)
      return NextResponse.json(
        { error: "Failed to fetch ticket" },
        { status: 500 }
      )
    }

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      )
    }

    const enrichedTicket = {
      ...ticket,
      assignee: ticket.assignee
        ? { ...ticket.assignee, image: ticket.assignee.avatar_url || null }
        : null,
      sqa_assignee: ticket.sqa_assignee
        ? { ...ticket.sqa_assignee, image: ticket.sqa_assignee.avatar_url || null }
        : null,
      requested_by: ticket.requested_by
        ? { ...ticket.requested_by, image: ticket.requested_by.avatar_url || null }
        : null,
    }

    return NextResponse.json({ ticket: enrichedTicket })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/tickets/by-display-id/[displayId]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


