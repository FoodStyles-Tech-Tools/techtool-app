import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
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
        assignee:users!tickets_assignee_id_fkey(id, name, email),
        sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email),
        requested_by:users!tickets_requested_by_id_fkey(id, name, email),
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

    // Get images from auth_user for assignee, SQA assignee, and requested_by
    const emails = new Set<string>()
    if (ticket.assignee?.email) emails.add(ticket.assignee.email)
    if (ticket.sqa_assignee?.email) emails.add(ticket.sqa_assignee.email)
    if (ticket.requested_by?.email) emails.add(ticket.requested_by.email)
    
    let enrichedTicket = ticket
    if (emails.size > 0) {
      const { data: authUsers } = await supabase
        .from("auth_user")
        .select("email, image")
        .in("email", Array.from(emails))
      
      // Create a map of email -> image
      const imageMap = new Map<string, string | null>()
      authUsers?.forEach(au => {
        imageMap.set(au.email, au.image || null)
      })
      
      // Enrich ticket with images
      enrichedTicket = {
        ...enrichedTicket,
        assignee: ticket.assignee ? {
          ...ticket.assignee,
          image: imageMap.get(ticket.assignee.email) || null,
        } : null,
        sqa_assignee: ticket.sqa_assignee ? {
          ...ticket.sqa_assignee,
          image: imageMap.get(ticket.sqa_assignee.email) || null,
        } : null,
      }
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
