import { NextRequest, NextResponse } from "next/server"
import { getRequestContext } from "@/lib/auth-helpers"
import type { TicketDetailPayload, TicketPerson } from "@/types/api/tickets"
import { getOrSetServerCache } from "@/lib/server/cache"
import { sanitizeLinkArray } from "@/lib/links"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function normalizeUser(
  value: any
): { id: string; name: string | null; email: string; avatar_url?: string | null } | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

function toTicketPerson(
  user: { id: string; name: string | null; email: string; avatar_url?: string | null } | null
): TicketPerson | null {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.avatar_url || null,
  }
}

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

    const payload = await getOrSetServerCache<{ ticket: TicketDetailPayload }>(
      `v2:ticket:${userId}:${params.id}`,
      30,
      async () => {
        const { data: ticket, error } = await supabase
          .from("tickets")
          .select(
            `
            id,
            display_id,
            parent_ticket_id,
            title,
            description,
            status,
            priority,
            type,
            links,
            reason,
            due_date,
            assigned_at,
            sqa_assigned_at,
            started_at,
            completed_at,
            created_at,
            updated_at,
            project:projects(id, name, description, require_sqa),
            assignee:users!tickets_assignee_id_fkey(id, name, email, avatar_url),
            sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email, avatar_url),
            requested_by:users!tickets_requested_by_id_fkey(id, name, email, avatar_url),
            department:departments(id, name),
            epic:epics(id, name, color),
            sprint:sprints(id, name, status, start_date, end_date)
          `
          )
          .eq("id", params.id)
          .single()

        if (error || !ticket) {
          throw new Error("Ticket not found")
        }

        const assignee = normalizeUser((ticket as any).assignee)
        const sqaAssignee = normalizeUser((ticket as any).sqa_assignee)
        const requestedBy = normalizeUser((ticket as any).requested_by)

        return {
            ticket: {
              id: ticket.id,
              display_id: ticket.display_id,
              parent_ticket_id: ticket.parent_ticket_id,
              title: ticket.title,
              description: ticket.description,
              status: ticket.status,
              priority: ticket.priority,
              type: ticket.type,
              links: sanitizeLinkArray(ticket.links),
              reason: ticket.reason,
              due_date: ticket.due_date,
              assigned_at: ticket.assigned_at,
              sqa_assigned_at: ticket.sqa_assigned_at,
            started_at: ticket.started_at,
            completed_at: ticket.completed_at,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            project: ticket.project
              ? Array.isArray(ticket.project)
                ? ticket.project[0]
                : ticket.project
              : null,
            assignee: toTicketPerson(assignee),
            sqa_assignee: toTicketPerson(sqaAssignee),
            requested_by: toTicketPerson(requestedBy),
            department: ticket.department
              ? Array.isArray(ticket.department)
                ? ticket.department[0]
                : ticket.department
              : null,
            epic: ticket.epic
              ? Array.isArray(ticket.epic)
                ? ticket.epic[0]
                : ticket.epic
              : null,
            sprint: ticket.sprint
              ? Array.isArray(ticket.sprint)
                ? ticket.sprint[0]
                : ticket.sprint
              : null,
          },
        }
      }
    )

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
