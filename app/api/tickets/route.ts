import { NextRequest, NextResponse } from "next/server"
import { getRequestContext } from "@/lib/auth-helpers"
import { normalizeRichTextInput } from "@/lib/rich-text"
import { fetchTicketList, parseTicketListQuery } from "@/lib/server/tickets-list"
import { prepareLinkPayload } from "@/lib/links"

export const runtime = 'nodejs'

const LEGACY_CREATE_BODY_KEYS = [
  "project_id",
  "assignee_id",
  "sqa_assignee_id",
  "sqa_assigned_at",
  "requested_by_id",
  "due_date",
  "department_id",
  "epic_id",
  "sprint_id",
  "parent_ticket_id",
  "created_at",
]

function hasOwn(obj: unknown, key: string): boolean {
  if (!obj || typeof obj !== "object") return false
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function readBodyValue<T = unknown>(body: Record<string, unknown>, camelKey: string, snakeKey?: string): T | undefined {
  if (hasOwn(body, camelKey)) {
    return body[camelKey] as T
  }
  if (snakeKey && hasOwn(body, snakeKey)) {
    return body[snakeKey] as T
  }
  return undefined
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
      requireUserContext: false,
    })

    const { searchParams } = new URL(request.url)
    const listQuery = parseTicketListQuery(searchParams)
    const result = await fetchTicketList(supabase, listQuery)

    const responseBody = {
      tickets: result.items,
      ...(result.pageInfo ? { pagination: result.pageInfo } : {}),
      ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
    }

    return NextResponse.json(responseBody, {
      headers: {
        "X-Techtool-Deprecated": "Use /api/v2/tickets",
      },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/tickets:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "create" },
    })

    const body = (await request.json()) as Record<string, unknown>
    const projectId = readBodyValue<string | null>(body, "projectId", "project_id")
    const title = readBodyValue<string>(body, "title")
    const description = readBodyValue<string | null>(body, "description")
    const assigneeId = readBodyValue<string | null>(body, "assigneeId", "assignee_id")
    const sqaAssigneeId = readBodyValue<string | null>(body, "sqaAssigneeId", "sqa_assignee_id")
    const sqaAssignedAtRaw = readBodyValue<string | null>(body, "sqaAssignedAt", "sqa_assigned_at")
    const requestedById = readBodyValue<string | null>(body, "requestedById", "requested_by_id")
    const priority = (readBodyValue<string>(body, "priority") || "medium").trim()
    const type = (readBodyValue<string>(body, "type") || "task").trim()
    const status = (readBodyValue<string>(body, "status") || "open").trim()
    const departmentId = readBodyValue<string | null>(body, "departmentId", "department_id")
    const epicId = readBodyValue<string | null>(body, "epicId", "epic_id")
    const sprintId = readBodyValue<string | null>(body, "sprintId", "sprint_id")
    const parentTicketId = readBodyValue<string | null>(body, "parentTicketId", "parent_ticket_id")
    const dueDate = readBodyValue<string | null>(body, "dueDate", "due_date")
    const links = readBodyValue<string[] | null>(body, "links")
    const createdAt = readBodyValue<string | null>(body, "createdAt", "created_at")

    const usedLegacyBodyKeys = LEGACY_CREATE_BODY_KEYS.filter((key) => hasOwn(body, key))
    const deprecationHeaders =
      usedLegacyBodyKeys.length > 0
        ? {
            "X-Techtool-Deprecated": "snake_case request body keys are deprecated; use camelCase keys",
            "X-Techtool-Deprecated-Fields": usedLegacyBodyKeys.join(","),
          }
        : undefined

    const normalizedDescription = normalizeRichTextInput(description)

    if (!title || !String(title).trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    if (parentTicketId) {
      const { data: parentTicket, error: parentTicketError } = await supabase
        .from("tickets")
        .select("id, type")
        .eq("id", parentTicketId)
        .maybeSingle()

      if (parentTicketError || !parentTicket) {
        return NextResponse.json(
          { error: "Parent ticket not found" },
          { status: 400 }
        )
      }
      if (parentTicket.type === "subtask") {
        return NextResponse.json(
          { error: "A subtask ticket cannot have child subtasks" },
          { status: 400 }
        )
      }
    }

    // Use provided requestedById or default to current user
    const finalRequestedById = requestedById || userId

    // Set timestamps based on assignee and status
    const now = new Date().toISOString()
    
    const assignedAt = assigneeId ? now : null
    const sqaAssignedAt = sqaAssignedAtRaw ?? (sqaAssigneeId ? now : null)
    let startedAt: string | null = null
    let completedAt: string | null = null
    
    // If status is "in_progress", set started_at
    if (status === "in_progress") {
      startedAt = now
    }
    
    // If status is "cancelled" or "completed", set completed_at and started_at
    if (status === "cancelled" || status === "completed") {
      completedAt = now
      startedAt = now // Also set started_at when completing
    }

    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert({
        project_id: projectId || null,
        title,
        description: normalizedDescription,
        assignee_id: assigneeId || null,
        sqa_assignee_id: sqaAssigneeId || null,
        sqa_assigned_at: sqaAssignedAt,
        assigned_at: assignedAt,
        started_at: startedAt,
        completed_at: completedAt,
        due_date: dueDate || null,
        links: prepareLinkPayload(Array.isArray(links) ? links : []),
        ...(createdAt ? { created_at: createdAt } : {}),
        requested_by_id: finalRequestedById,
        priority,
        type,
        status,
        activity_actor_id: userId,
        department_id: departmentId || null,
        epic_id: epicId || null,
        sprint_id: sprintId || null,
        parent_ticket_id: parentTicketId || null,
      })
      .select(`
        *,
        project:projects(id, name, require_sqa),
        assignee:users!tickets_assignee_id_fkey(id, name, email, avatar_url),
        sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email, avatar_url),
        requested_by:users!tickets_requested_by_id_fkey(id, name, email, avatar_url),
        department:departments(id, name),
        epic:epics(id, name, color),
        sprint:sprints(id, name, status)
      `)
      .single()

    if (error) {
      console.error("Error creating ticket:", error)
      // Handle coercion error specifically
      if (error.message?.includes("coerce") || error.message?.includes("single JSON")) {
        console.error("Multiple rows returned after ticket creation")
        return NextResponse.json(
          { error: "Ticket creation data inconsistency detected" },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: "Failed to create ticket" },
        { status: 500 }
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

      return NextResponse.json(
        { ticket: enrichedTicket },
        {
          status: 201,
          ...(deprecationHeaders ? { headers: deprecationHeaders } : {}),
        }
      )
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/tickets:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
