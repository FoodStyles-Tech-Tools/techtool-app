import { NextRequest, NextResponse } from "next/server"
import { getRequestContext } from "@/lib/auth-helpers"
import { normalizeRichTextInput } from "@/lib/rich-text"
import { prepareLinkPayload } from "@/lib/links"
import { enqueueTicketStatusDiscordNotifications } from "@/lib/server/discord-outbox"
import { invalidateTicketCaches } from "@/lib/server/ticket-cache"

export const runtime = 'nodejs'

const LEGACY_PATCH_BODY_KEYS = [
  "assignee_id",
  "sqa_assignee_id",
  "sqa_assigned_at",
  "requested_by_id",
  "due_date",
  "project_id",
  "department_id",
  "epic_id",
  "sprint_id",
  "parent_ticket_id",
  "created_at",
  "assigned_at",
  "started_at",
  "completed_at",
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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
      requireUserContext: false,
    })

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select(`
        *,
        project:projects(id, name, description, require_sqa),
        assignee:users!tickets_assignee_id_fkey(id, name, email, avatar_url),
        sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email, avatar_url),
        requested_by:users!tickets_requested_by_id_fkey(id, name, email, avatar_url),
        department:departments(id, name),
        epic:epics(id, name, color),
        sprint:sprints(id, name, status, start_date, end_date)
      `)
      .eq("id", params.id)
      .maybeSingle()

    if (error) {
      console.error("Error fetching ticket:", error)
      // Handle coercion error specifically
      if (error.message?.includes("coerce") || error.message?.includes("single JSON")) {
        console.error("Multiple rows returned for ticket ID:", params.id)
        return NextResponse.json(
          { error: "Ticket data inconsistency detected" },
          { status: 500 }
        )
      }
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

    return NextResponse.json(
      { ticket: enrichedTicket },
      {
        headers: {
          "X-Techtool-Deprecated": "Use /api/v2/tickets/[id]?view=detail",
        },
      }
    )
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/tickets/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "edit" },
    })

    const body = (await request.json()) as Record<string, unknown>
    const hasField = (camelKey: string, snakeKey?: string) =>
      hasOwn(body, camelKey) || (snakeKey ? hasOwn(body, snakeKey) : false)

    const title = readBodyValue<string>(body, "title")
    const description = readBodyValue<string | null>(body, "description")
    const assigneeId = readBodyValue<string | null>(body, "assigneeId", "assignee_id")
    const hasAssigneeId = hasField("assigneeId", "assignee_id")
    const sqaAssigneeId = readBodyValue<string | null>(body, "sqaAssigneeId", "sqa_assignee_id")
    const hasSqaAssigneeId = hasField("sqaAssigneeId", "sqa_assignee_id")
    const sqaAssignedAt = readBodyValue<string | null>(body, "sqaAssignedAt", "sqa_assigned_at")
    const hasSqaAssignedAt = hasField("sqaAssignedAt", "sqa_assigned_at")
    const requestedById = readBodyValue<string | null>(body, "requestedById", "requested_by_id")
    const hasRequestedById = hasField("requestedById", "requested_by_id")
    const status = readBodyValue<string>(body, "status")
    const hasStatus = hasField("status")
    const priority = readBodyValue<string>(body, "priority")
    const hasPriority = hasField("priority")
    const type = readBodyValue<string>(body, "type")
    const hasType = hasField("type")
    const dueDate = readBodyValue<string | null>(body, "dueDate", "due_date")
    const hasDueDate = hasField("dueDate", "due_date")
    const projectId = readBodyValue<string | null>(body, "projectId", "project_id")
    const hasProjectId = hasField("projectId", "project_id")
    const links = readBodyValue<string[] | null>(body, "links")
    const hasLinks = hasField("links")
    const departmentId = readBodyValue<string | null>(body, "departmentId", "department_id")
    const hasDepartmentId = hasField("departmentId", "department_id")
    const epicId = readBodyValue<string | null>(body, "epicId", "epic_id")
    const hasEpicId = hasField("epicId", "epic_id")
    const sprintId = readBodyValue<string | null>(body, "sprintId", "sprint_id")
    const hasSprintId = hasField("sprintId", "sprint_id")
    const parentTicketId = readBodyValue<string | null>(body, "parentTicketId", "parent_ticket_id")
    const hasParentTicketId = hasField("parentTicketId", "parent_ticket_id")
    const createdAt = readBodyValue<string | null>(body, "createdAt", "created_at")
    const hasCreatedAt = hasField("createdAt", "created_at")
    const assignedAt = readBodyValue<string | null>(body, "assignedAt", "assigned_at")
    const hasAssignedAt = hasField("assignedAt", "assigned_at")
    const startedAt = readBodyValue<string | null>(body, "startedAt", "started_at")
    const hasStartedAt = hasField("startedAt", "started_at")
    const completedAt = readBodyValue<string | null>(body, "completedAt", "completed_at")
    const hasCompletedAt = hasField("completedAt", "completed_at")
    const reason = readBodyValue<unknown>(body, "reason")
    const hasReason = hasField("reason")

    const usedLegacyBodyKeys = LEGACY_PATCH_BODY_KEYS.filter((key) => hasOwn(body, key))
    const deprecationHeaders =
      usedLegacyBodyKeys.length > 0
        ? {
            "X-Techtool-Deprecated": "snake_case request body keys are deprecated; use camelCase keys",
            "X-Techtool-Deprecated-Fields": usedLegacyBodyKeys.join(","),
          }
        : undefined

    // Always fetch current ticket for edit guard and timestamp logic.
    const [{ data: currentTicket, error: fetchError }, { data: currentUser, error: userError }] =
      await Promise.all([
        supabase
          .from("tickets")
          .select("assignee_id, sqa_assignee_id, assigned_at, sqa_assigned_at, status, started_at, completed_at, created_at")
          .eq("id", params.id)
          .maybeSingle(),
        supabase
          .from("users")
          .select("role")
          .eq("id", userId)
          .maybeSingle(),
      ])

    if (fetchError) {
      console.error("Error fetching current ticket:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch ticket" },
        { status: 500 }
      )
    }

    if (!currentTicket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      )
    }

    if (userError) {
      console.error("Error fetching current user role:", userError)
      return NextResponse.json(
        { error: "Failed to validate user role" },
        { status: 500 }
      )
    }

    const isSqaUser = (currentUser?.role || "").toLowerCase() === "sqa"
    if (isSqaUser) {
      const currentSqaAssigneeId = currentTicket.sqa_assignee_id || null
      const requestedSqaAssigneeId =
        !hasSqaAssigneeId ? undefined : (sqaAssigneeId || null)
      const touchedNonSqaAssignmentField = Object.keys(body).some(
        (field) =>
          field !== "sqa_assignee_id" &&
          field !== "sqa_assigned_at" &&
          field !== "sqaAssigneeId" &&
          field !== "sqaAssignedAt"
      )
      const isSelfAssignOnlyRequest =
        hasSqaAssigneeId &&
        requestedSqaAssigneeId === userId &&
        !touchedNonSqaAssignmentField

      if (currentSqaAssigneeId !== userId && !isSelfAssignOnlyRequest) {
        return NextResponse.json(
          {
            error:
              "SQA users can only edit tickets assigned to them. Assign yourself as SQA first.",
          },
          { status: 403 }
        )
      }
    }

    const updates: any = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = normalizeRichTextInput(description)
    if (hasAssigneeId) {
      const previousAssigneeId = currentTicket?.assignee_id
      updates.assignee_id = assigneeId || null
      
      // If assignee is being cleared, also clear assigned_at
      if (!assigneeId) {
        updates.assigned_at = null
      } else if (!hasAssignedAt) {
        // Condition 1: When assignee changed from Null -> add value then add assigned_at timestamp
        // Condition 2: If assignee is not null then change value then change timestamp assigned_at
        if (!previousAssigneeId || previousAssigneeId !== assigneeId) {
          updates.assigned_at = new Date().toISOString()
        }
      }
    }
    if (hasSqaAssigneeId) {
      const previousSqaAssigneeId = currentTicket?.sqa_assignee_id
      updates.sqa_assignee_id = sqaAssigneeId || null

      if (!sqaAssigneeId) {
        updates.sqa_assigned_at = null
      } else if (!hasSqaAssignedAt) {
        if (!previousSqaAssigneeId || previousSqaAssigneeId !== sqaAssigneeId) {
          updates.sqa_assigned_at = new Date().toISOString()
        }
      }
    }
    if (hasRequestedById) {
      updates.requested_by_id = requestedById
    }
    if (hasStatus) {
      const previousStatus = currentTicket?.status
      updates.status = status
      
      // Condition 2: When status from Open/Blocked to any other status then update started_at timestamp
      if ((previousStatus === "open" || previousStatus === "blocked") && status !== "open" && status !== "blocked") {
        if (!hasStartedAt) {
          updates.started_at = new Date().toISOString()
        }
      }
      
      // Condition 3: When any status changed to Cancelled or Completed then update completed_at timestamp
      if (status === "completed" || status === "cancelled" || status === "rejected") {
        if (!hasCompletedAt) {
          updates.completed_at = new Date().toISOString()
        }
        // Also ensure started_at is set if not already
        if (!hasStartedAt && !currentTicket?.started_at) {
          updates.started_at = new Date().toISOString()
        }
      }
      
      // Condition 4: If status changed from Completed/Cancelled to other status then remove timestamp completed_at
      if (
        (previousStatus === "completed" || previousStatus === "cancelled" || previousStatus === "rejected") &&
        status !== "completed" &&
        status !== "cancelled" &&
        status !== "rejected"
      ) {
        updates.completed_at = null
        // Clear reason when moving away from cancelled
        updates.reason = null
      }
      
      // Condition 5: If status changed from In Progress to Blocked or Open then remove timestamp started_at
      if (previousStatus === "in_progress" && (status === "blocked" || status === "open")) {
        updates.started_at = null
      }
      
      // Additional: If status is open, clear started_at and completed_at
      if (status === "open") {
        updates.started_at = null
        updates.completed_at = null
      }
      
      // Additional: If status is in_progress or blocked (and not coming from open/blocked), ensure started_at is set
      if ((status === "in_progress" || status === "blocked") && previousStatus !== "open" && previousStatus !== "blocked") {
        if (!hasStartedAt && !currentTicket?.started_at) {
          updates.started_at = new Date().toISOString()
        }
        updates.completed_at = null
      }
    }
    if (hasPriority) updates.priority = priority
    if (hasType) updates.type = type
    if (hasDueDate) updates.due_date = dueDate || null
    if (hasProjectId) updates.project_id = projectId || null
    if (hasLinks) updates.links = prepareLinkPayload(Array.isArray(links) ? links : [])
    if (hasDepartmentId) updates.department_id = departmentId || null
    if (hasEpicId) updates.epic_id = epicId || null
    if (hasSprintId) updates.sprint_id = sprintId || null
    if (hasParentTicketId) {
      if (parentTicketId && parentTicketId === params.id) {
        return NextResponse.json(
          { error: "A ticket cannot be its own parent" },
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
      updates.parent_ticket_id = parentTicketId || null
    }
    if (hasReason) updates.reason = reason
    updates.activity_actor_id = userId
    
    // Timestamp validation: Check ordering constraints before applying updates
    // Rules:
    // 1. created_at <= assigned_at, started_at, completed_at
    // 2. assigned_at >= created_at AND assigned_at <= started_at, completed_at
    // 3. started_at >= created_at, assigned_at AND started_at <= completed_at
    // 4. completed_at >= created_at, assigned_at, started_at
    const validateTimestampOrder = (field: string, value: string | null, otherTimestamps: Record<string, string | null>) => {
      if (!value) return true // null values are allowed
      
      const fieldDate = new Date(value)
      if (isNaN(fieldDate.getTime())) return false // invalid date
      
      // Check created_at constraints: created_at <= all others
      if (field === "created_at") {
        if (otherTimestamps.assigned_at && fieldDate > new Date(otherTimestamps.assigned_at)) return false
        if (otherTimestamps.started_at && fieldDate > new Date(otherTimestamps.started_at)) return false
        if (otherTimestamps.completed_at && fieldDate > new Date(otherTimestamps.completed_at)) return false
      }
      
      // Check assigned_at constraints: assigned_at >= created_at AND assigned_at <= started_at, completed_at
      if (field === "assigned_at") {
        if (otherTimestamps.created_at && fieldDate < new Date(otherTimestamps.created_at)) return false
        if (otherTimestamps.started_at && fieldDate > new Date(otherTimestamps.started_at)) return false
        if (otherTimestamps.completed_at && fieldDate > new Date(otherTimestamps.completed_at)) return false
      }
      
      // Check started_at constraints: started_at >= created_at, assigned_at AND started_at <= completed_at
      if (field === "started_at") {
        if (otherTimestamps.created_at && fieldDate < new Date(otherTimestamps.created_at)) return false
        if (otherTimestamps.assigned_at && fieldDate < new Date(otherTimestamps.assigned_at)) return false
        if (otherTimestamps.completed_at && fieldDate > new Date(otherTimestamps.completed_at)) return false
      }
      
      // Check completed_at constraints: completed_at >= created_at, assigned_at, started_at
      if (field === "completed_at") {
        if (otherTimestamps.created_at && fieldDate < new Date(otherTimestamps.created_at)) return false
        if (otherTimestamps.assigned_at && fieldDate < new Date(otherTimestamps.assigned_at)) return false
        if (otherTimestamps.started_at && fieldDate < new Date(otherTimestamps.started_at)) return false
      }
      
      return true
    }
    
    // Build timestamp map for validation
    const timestampMap: Record<string, string | null> = {
      created_at: hasCreatedAt ? (createdAt || null) : (currentTicket?.created_at || null),
      assigned_at: hasAssignedAt ? (assignedAt || null) : (updates.assigned_at !== undefined ? updates.assigned_at : (currentTicket?.assigned_at || null)),
      started_at: hasStartedAt ? (startedAt || null) : (updates.started_at !== undefined ? updates.started_at : (currentTicket?.started_at || null)),
      completed_at: hasCompletedAt ? (completedAt || null) : (updates.completed_at !== undefined ? updates.completed_at : (currentTicket?.completed_at || null)),
    }
    
    // Validate and apply timestamp updates
    if (hasCreatedAt) {
      if (validateTimestampOrder("created_at", createdAt || null, timestampMap)) {
        updates.created_at = createdAt || null
      } else {
        return NextResponse.json(
          { error: "created_at cannot be higher than assigned_at, started_at, or completed_at" },
          { status: 400 }
        )
      }
    }
    
    if (hasAssignedAt) {
      timestampMap.assigned_at = assignedAt || null
      if (validateTimestampOrder("assigned_at", assignedAt || null, timestampMap)) {
        updates.assigned_at = assignedAt || null
      } else {
        return NextResponse.json(
          { error: "assigned_at must be >= created_at and <= started_at, completed_at" },
          { status: 400 }
        )
      }
    }

    if (hasSqaAssignedAt) {
      updates.sqa_assigned_at = sqaAssignedAt || null
    }
    
    if (hasStartedAt) {
      timestampMap.started_at = startedAt || null
      if (validateTimestampOrder("started_at", startedAt || null, timestampMap)) {
        updates.started_at = startedAt || null
      } else {
        return NextResponse.json(
          { error: "started_at must be >= created_at, assigned_at and <= completed_at" },
          { status: 400 }
        )
      }
    }
    
    if (hasCompletedAt) {
      timestampMap.completed_at = completedAt || null
      if (validateTimestampOrder("completed_at", completedAt || null, timestampMap)) {
        updates.completed_at = completedAt || null
      } else {
        return NextResponse.json(
          { error: "completed_at must be >= created_at, assigned_at, and started_at" },
          { status: 400 }
        )
      }
    }

    const previousStatus = currentTicket?.status ?? null

    const { data: ticket, error } = await supabase
      .from("tickets")
      .update(updates)
      .eq("id", params.id)
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
      .single()

    if (error) {
      console.error("Error updating ticket:", error)
      // Handle coercion error specifically
      if (error.message?.includes("coerce") || error.message?.includes("single JSON")) {
        console.error("Multiple rows returned for ticket ID:", params.id)
        return NextResponse.json(
          { error: "Ticket data inconsistency detected" },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: error.message || "Failed to update ticket" },
        { status: 500 }
      )
    }

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      )
    }

    if (hasStatus) {
      void enqueueTicketStatusDiscordNotifications(supabase, ticket, previousStatus)
    }

    await invalidateTicketCaches()

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
      deprecationHeaders ? { headers: deprecationHeaders } : undefined
    )
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in PATCH /api/tickets/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
