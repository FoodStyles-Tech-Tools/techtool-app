import { NextRequest, NextResponse } from "next/server"
import { getSupabaseWithUserContext, requirePermission } from "@/lib/auth-helpers"

export const runtime = "nodejs"

/** GET /api/tickets/[id]/activity – ticket activity timeline (comments + history + subtasks) */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("tickets", "view")
    const { supabase } = await getSupabaseWithUserContext()

    const ticketId = params.id

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id")
      .eq("id", ticketId)
      .maybeSingle()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("ticket_activity")
      .select(
        `
        id,
        ticket_id,
        actor_id,
        event_type,
        field_name,
        old_value,
        new_value,
        metadata,
        created_at,
        actor:users!ticket_activity_actor_id_fkey(id, name, email, avatar_url)
      `
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(300)

    if (error) {
      console.error("Error fetching ticket activity:", error)
      return NextResponse.json(
        { error: "Failed to fetch ticket activity" },
        { status: 500 }
      )
    }

    const activities = (data || []).map((row: any) => ({
      ...row,
      actor: Array.isArray(row.actor) ? row.actor[0] ?? null : row.actor ?? null,
    }))

    return NextResponse.json({ activities })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/tickets/[id]/activity:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
