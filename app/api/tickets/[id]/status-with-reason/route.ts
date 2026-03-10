import { NextRequest, NextResponse } from "next/server"
import { getRequestContext } from "@/lib/auth-helpers"
import { isRichTextEmpty } from "@/lib/rich-text"
import { enqueueTicketStatusDiscordNotifications } from "@/lib/server/discord-outbox"
import { invalidateTicketCaches } from "@/lib/server/ticket-cache"

export const runtime = "nodejs"

const LEGACY_STATUS_REASON_BODY_KEYS = [
  "reason_comment_body",
  "started_at",
  "completed_at",
  "epic_id",
]

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

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

function parseOptionalTimestamp(value: unknown): string | null {
  if (value === undefined) return null
  if (value === null) return null
  if (typeof value !== "string") {
    throw new Error("Invalid timestamp value")
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid timestamp value")
  }
  return value
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, userId, userRole } = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })

    const ticketId = params.id
    const body = (await request.json()) as Record<string, unknown>
    const hasField = (camelKey: string, snakeKey?: string) =>
      hasOwn(body, camelKey) || (snakeKey ? hasOwn(body, snakeKey) : false)

    const statusValue = readBodyValue<string>(body, "status")
    const status = typeof statusValue === "string" ? statusValue : ""
    if (status !== "cancelled" && status !== "rejected" && status !== "returned_to_dev") {
      return NextResponse.json(
        { error: "Only cancelled/rejected/returned_to_dev status is supported by this endpoint" },
        { status: 400 }
      )
    }

    const reason = readBodyValue<unknown>(body, "reason")
    const hasReason = reason !== undefined
    if (hasReason && (!reason || typeof reason !== "object" || Array.isArray(reason))) {
      return NextResponse.json({ error: "Invalid reason object" }, { status: 400 })
    }
    if ((status === "cancelled" || status === "rejected") && !hasReason) {
      return NextResponse.json({ error: "reason object is required" }, { status: 400 })
    }

    const reasonCommentBodyValue = readBodyValue<string>(body, "reasonCommentBody", "reason_comment_body")
    const reasonCommentBody = typeof reasonCommentBodyValue === "string" ? reasonCommentBodyValue.trim() : ""
    if (!reasonCommentBody || isRichTextEmpty(reasonCommentBody)) {
      return NextResponse.json({ error: "Reason comment body is required" }, { status: 400 })
    }

    const hasStartedAt = hasField("startedAt", "started_at")
    const hasCompletedAt = hasField("completedAt", "completed_at")
    const hasEpicId = hasField("epicId", "epic_id")

    let startedAt: string | null = null
    let completedAt: string | null = null
    try {
      startedAt = hasStartedAt
        ? parseOptionalTimestamp(readBodyValue<unknown>(body, "startedAt", "started_at"))
        : null
      completedAt = hasCompletedAt
        ? parseOptionalTimestamp(readBodyValue<unknown>(body, "completedAt", "completed_at"))
        : null
    } catch {
      return NextResponse.json({ error: "Invalid timestamp value" }, { status: 400 })
    }

    const epicIdValue = readBodyValue<unknown>(body, "epicId", "epic_id")
    const epicId = hasEpicId
      ? epicIdValue === null || typeof epicIdValue === "string"
        ? (epicIdValue as string | null)
        : "__invalid__"
      : null
    if (epicId === "__invalid__") {
      return NextResponse.json({ error: "Invalid epicId value" }, { status: 400 })
    }

    const usedLegacyBodyKeys = LEGACY_STATUS_REASON_BODY_KEYS.filter((key) => hasOwn(body, key))
    const deprecationHeaders =
      usedLegacyBodyKeys.length > 0
        ? {
            "X-Techtool-Deprecated": "snake_case request body keys are deprecated; use camelCase keys",
            "X-Techtool-Deprecated-Fields": usedLegacyBodyKeys.join(","),
          }
        : undefined

    const [{ data: currentTicket, error: ticketError }] = await Promise.all([
      supabase
        .from("tickets")
        .select("id, status, sqa_assignee_id")
        .eq("id", ticketId)
        .maybeSingle(),
    ])

    if (ticketError) {
      console.error("Error fetching current ticket:", ticketError)
      return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 })
    }

    if (!currentTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    if ((userRole || "").toLowerCase() === "sqa" && currentTicket.sqa_assignee_id !== userId) {
      return NextResponse.json(
        { error: "SQA users can only edit tickets assigned to them. Assign yourself as SQA first." },
        { status: 403 }
      )
    }

    const previousStatus = currentTicket.status ?? null

    const { error: rpcError } = await supabase.rpc(
      "update_ticket_status_with_reason_comment",
      {
        p_ticket_id: ticketId,
        p_actor_id: userId,
        p_status: status,
        p_reason: hasReason ? reason : null,
        p_set_reason: hasReason,
        p_reason_comment_body: reasonCommentBody,
        p_started_at: startedAt,
        p_set_started_at: hasStartedAt,
        p_completed_at: completedAt,
        p_set_completed_at: hasCompletedAt,
        p_epic_id: hasEpicId ? epicId : null,
        p_set_epic_id: hasEpicId,
      }
    )

    if (rpcError) {
      const detail = rpcError.details || ""
      if (detail === "ticket_not_found") {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
      }
      console.error("Error in update_ticket_status_with_reason_comment RPC:", rpcError)
      return NextResponse.json(
        { error: rpcError.message || "Failed to update ticket" },
        { status: 500 }
      )
    }

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select(`
        *,
        project:projects(id, name, require_sqa),
        assignee:users!tickets_assignee_id_fkey(id, name, email, role, discord_id, avatar_url),
        sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email, role, discord_id, avatar_url),
        requested_by:users!tickets_requested_by_id_fkey(id, name, email, avatar_url),
        department:departments(id, name),
        epic:epics(id, name, color),
        sprint:sprints(id, name, status)
      `)
      .eq("id", ticketId)
      .single()

    if (error || !ticket) {
      console.error("Error fetching updated ticket:", error)
      return NextResponse.json({ error: "Failed to fetch updated ticket" }, { status: 500 })
    }

    const normalizedTicket = {
      ...ticket,
      project: normalizeRelation(ticket.project),
      assignee: normalizeRelation(ticket.assignee),
      sqa_assignee: normalizeRelation(ticket.sqa_assignee),
      requested_by: normalizeRelation(ticket.requested_by),
      department: normalizeRelation(ticket.department),
      epic: normalizeRelation(ticket.epic),
      sprint: normalizeRelation(ticket.sprint),
    }

    await enqueueTicketStatusDiscordNotifications(supabase, normalizedTicket, previousStatus)
    await invalidateTicketCaches()

    const enrichedTicket = {
      ...normalizedTicket,
      assignee: normalizedTicket.assignee
        ? {
            ...normalizedTicket.assignee,
            image: normalizedTicket.assignee.avatar_url || null,
          }
        : null,
      sqa_assignee: normalizedTicket.sqa_assignee
        ? {
            ...normalizedTicket.sqa_assignee,
            image: normalizedTicket.sqa_assignee.avatar_url || null,
          }
        : null,
      requested_by: normalizedTicket.requested_by
        ? {
            ...normalizedTicket.requested_by,
            image: normalizedTicket.requested_by.avatar_url || null,
          }
        : null,
    }

    return NextResponse.json(
      { ticket: enrichedTicket },
      deprecationHeaders ? { headers: deprecationHeaders } : undefined
    )
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/tickets/[id]/status-with-reason:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
