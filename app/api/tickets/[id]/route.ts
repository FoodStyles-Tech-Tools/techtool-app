import { NextRequest, NextResponse } from "next/server"
import { getSupabaseWithUserContext, requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"
import { normalizeRichTextInput } from "@/lib/rich-text"
import { prepareLinkPayload } from "@/lib/links"

export const runtime = 'nodejs'

const DISCORD_TICKET_BASE_URL = "https://techtool-app.vercel.app/tickets"

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function buildDiscordRoleEnvKey(role: string | null | undefined): string | null {
  if (!role) return null
  const normalized = role.trim().replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()
  return normalized ? `DISCORD_ROLE_${normalized}` : null
}

function buildDiscordRoleMention(roleId: string | null | undefined): string | null {
  if (!roleId) return null
  return `<@&${roleId}>`
}

function buildDiscordUserMention(userId: string | null | undefined): string | null {
  if (!userId) return null
  return `<@${userId}>`
}

function escapeDiscordMarkdown(value: string): string {
  return value.replace(/([\\\[\]])/g, "\\$1")
}

async function resolveDiscordUserIdByEmail(
  supabase: any,
  email: string,
  logContext: string
): Promise<string | null> {
  const { data: authUser, error: authUserError } = await supabase
    .from("auth_user")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (authUserError) {
    console.error(`Failed to resolve auth_user for ${logContext}:`, authUserError)
    return null
  }

  if (!authUser?.id) return null

  const { data: discordAccount, error: discordAccountError } = await supabase
    .from("account")
    .select('"accountId", "providerId"')
    .eq("userId", authUser.id)
    .ilike("providerId", "discord%")
    .limit(1)
    .maybeSingle()

  if (discordAccountError) {
    console.error(`Failed to resolve Discord account for ${logContext}:`, discordAccountError)
    return null
  }

  return (discordAccount as { accountId?: string } | null)?.accountId ?? null
}

function buildDiscordTicketLine(ticket: any): string {
  const ticketLabel = String(ticket.display_id ?? ticket.id)
  const ticketTitle = escapeDiscordMarkdown(ticket.title ?? "Untitled ticket")
  const ticketSlug = String(ticket.display_id ?? ticket.id).toLowerCase()
  const ticketUrl = `${DISCORD_TICKET_BASE_URL}/${encodeURIComponent(ticketSlug)}`
  return `[[${escapeDiscordMarkdown(ticketLabel)}] - ${ticketTitle}](${ticketUrl})`
}

async function sendForQaDiscordNotification(
  supabase: any,
  ticket: any,
  previousStatus: string | null | undefined
) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return

  const project = normalizeRelation<{ require_sqa?: boolean }>(ticket.project)
  if (!project?.require_sqa) return

  const currentStatus = typeof ticket.status === "string" ? ticket.status : null
  if (currentStatus !== "for_qa" || previousStatus === "for_qa") return

  const sqaAssignee = normalizeRelation<{ role?: string; email?: string; discord_id?: string | null }>(ticket.sqa_assignee)
  const sqaRoleEnvKey = buildDiscordRoleEnvKey(sqaAssignee?.role)
  const defaultRoleId = process.env.DISCORD_ROLE_ID
  const fallbackSqaRoleId = process.env.DISCORD_ROLE_SQA

  let assignedSqaDiscordUserId: string | null = sqaAssignee?.discord_id?.trim() || null
  if (!assignedSqaDiscordUserId && ticket.sqa_assignee_id && sqaAssignee?.email) {
    assignedSqaDiscordUserId = await resolveDiscordUserIdByEmail(
      supabase,
      sqaAssignee.email,
      "SQA Discord mention"
    )
  }

  const mentionRoleId = ticket.sqa_assignee_id
    ? (sqaRoleEnvKey ? process.env[sqaRoleEnvKey] : null) ?? defaultRoleId ?? fallbackSqaRoleId
    : fallbackSqaRoleId ?? defaultRoleId

  const mention =
    buildDiscordUserMention(assignedSqaDiscordUserId) ??
    buildDiscordRoleMention(mentionRoleId) ??
    "SQA"
  const ticketLine = buildDiscordTicketLine(ticket)
  const content = `Hi ${mention},\n${ticketLine}\nReady for QA`

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) {
      const responseText = await response.text().catch(() => "")
      console.error("Discord webhook failed for For QA notification:", response.status, responseText)
    }
  } catch (error) {
    console.error("Discord webhook request failed for For QA notification:", error)
  }
}

async function sendReturnedToDevDiscordNotification(
  supabase: any,
  ticket: any,
  previousStatus: string | null | undefined
) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return

  const project = normalizeRelation<{ require_sqa?: boolean }>(ticket.project)
  if (!project?.require_sqa) return

  const currentStatus = typeof ticket.status === "string" ? ticket.status : null
  if (currentStatus !== "returned_to_dev" || previousStatus === "returned_to_dev") return

  const assignee = normalizeRelation<{ role?: string; email?: string; discord_id?: string | null }>(ticket.assignee)
  const assigneeRoleEnvKey = buildDiscordRoleEnvKey(assignee?.role)
  const defaultRoleId = process.env.DISCORD_ROLE_ID

  let assigneeDiscordUserId: string | null = assignee?.discord_id?.trim() || null
  if (!assigneeDiscordUserId && ticket.assignee_id && assignee?.email) {
    assigneeDiscordUserId = await resolveDiscordUserIdByEmail(
      supabase,
      assignee.email,
      "assignee Discord mention"
    )
  }

  const mentionRoleId = ticket.assignee_id
    ? (assigneeRoleEnvKey ? process.env[assigneeRoleEnvKey] : null) ?? defaultRoleId
    : defaultRoleId

  const mention =
    buildDiscordUserMention(assigneeDiscordUserId) ??
    buildDiscordRoleMention(mentionRoleId) ??
    "Assignee"
  const ticketLine = buildDiscordTicketLine(ticket)
  const content = `Hi ${mention},\n${ticketLine}\nReturned to Dev`

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) {
      const responseText = await response.text().catch(() => "")
      console.error("Discord webhook failed for Returned to Dev notification:", response.status, responseText)
    }
  } catch (error) {
    console.error("Discord webhook request failed for Returned to Dev notification:", error)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("tickets", "view")
    const supabase = createServerClient()

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select(`
        *,
        project:projects(id, name, description, require_sqa),
        assignee:users!tickets_assignee_id_fkey(id, name, email),
        sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email),
        requested_by:users!tickets_requested_by_id_fkey(id, name, email),
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
    await requirePermission("tickets", "edit")
    const { supabase, userId } = await getSupabaseWithUserContext()

    const body = await request.json()
    const {
      title,
      description,
      assignee_id,
      sqa_assignee_id,
      sqa_assigned_at,
      requested_by_id,
      status,
      priority,
      type,
      due_date,
      project_id,
      links,
      department_id,
      epic_id,
      sprint_id,
      created_at,
      assigned_at,
      started_at,
      completed_at,
      reason,
    } = body

    // Fetch current ticket state if we need it for conditional logic or timestamp validation
    let currentTicket: any = null
    if (assignee_id !== undefined || sqa_assignee_id !== undefined || status !== undefined || created_at !== undefined || assigned_at !== undefined || started_at !== undefined || completed_at !== undefined) {
      const { data, error: fetchError } = await supabase
        .from("tickets")
        .select("assignee_id, sqa_assignee_id, assigned_at, sqa_assigned_at, status, started_at, completed_at, created_at")
        .eq("id", params.id)
        .maybeSingle()
      
      if (fetchError) {
        console.error("Error fetching current ticket:", fetchError)
        return NextResponse.json(
          { error: "Failed to fetch ticket" },
          { status: 500 }
        )
      }
      
      if (!data) {
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 }
        )
      }
      
      currentTicket = data
    }

    const updates: any = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = normalizeRichTextInput(description)
    if (assignee_id !== undefined) {
      const previousAssigneeId = currentTicket?.assignee_id
      updates.assignee_id = assignee_id || null
      
      // If assignee is being cleared, also clear assigned_at
      if (!assignee_id) {
        updates.assigned_at = null
      } else if (assigned_at === undefined) {
        // Condition 1: When assignee changed from Null -> add value then add assigned_at timestamp
        // Condition 2: If assignee is not null then change value then change timestamp assigned_at
        if (!previousAssigneeId || previousAssigneeId !== assignee_id) {
          updates.assigned_at = new Date().toISOString()
        }
      }
    }
    if (sqa_assignee_id !== undefined) {
      const previousSqaAssigneeId = currentTicket?.sqa_assignee_id
      updates.sqa_assignee_id = sqa_assignee_id || null

      if (!sqa_assignee_id) {
        updates.sqa_assigned_at = null
      } else if (sqa_assigned_at === undefined) {
        if (!previousSqaAssigneeId || previousSqaAssigneeId !== sqa_assignee_id) {
          updates.sqa_assigned_at = new Date().toISOString()
        }
      }
    }
    if (requested_by_id !== undefined) {
      updates.requested_by_id = requested_by_id
    }
    if (status !== undefined) {
      const previousStatus = currentTicket?.status
      updates.status = status
      
      // Condition 2: When status from Open/Blocked to any other status then update started_at timestamp
      if ((previousStatus === "open" || previousStatus === "blocked") && status !== "open" && status !== "blocked") {
        if (started_at === undefined) {
          updates.started_at = new Date().toISOString()
        }
      }
      
      // Condition 3: When any status changed to Cancelled or Completed then update completed_at timestamp
      if (status === "completed" || status === "cancelled" || status === "rejected") {
        if (completed_at === undefined) {
          updates.completed_at = new Date().toISOString()
        }
        // Also ensure started_at is set if not already
        if (started_at === undefined && !currentTicket?.started_at) {
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
        if (started_at === undefined && !currentTicket?.started_at) {
          updates.started_at = new Date().toISOString()
        }
        updates.completed_at = null
      }
    }
    if (priority !== undefined) updates.priority = priority
    if (type !== undefined) updates.type = type
    if (due_date !== undefined) updates.due_date = due_date || null
    if (project_id !== undefined) updates.project_id = project_id || null
    if (links !== undefined) updates.links = prepareLinkPayload(Array.isArray(links) ? links : [])
    if (department_id !== undefined) updates.department_id = department_id || null
    if (epic_id !== undefined) updates.epic_id = epic_id || null
    if (sprint_id !== undefined) updates.sprint_id = sprint_id || null
    if (reason !== undefined) updates.reason = reason
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
      created_at: created_at !== undefined ? (created_at || null) : (currentTicket?.created_at || null),
      assigned_at: assigned_at !== undefined ? (assigned_at || null) : (updates.assigned_at !== undefined ? updates.assigned_at : (currentTicket?.assigned_at || null)),
      started_at: started_at !== undefined ? (started_at || null) : (updates.started_at !== undefined ? updates.started_at : (currentTicket?.started_at || null)),
      completed_at: completed_at !== undefined ? (completed_at || null) : (updates.completed_at !== undefined ? updates.completed_at : (currentTicket?.completed_at || null)),
    }
    
    // Validate and apply timestamp updates
    if (created_at !== undefined) {
      if (validateTimestampOrder("created_at", created_at || null, timestampMap)) {
        updates.created_at = created_at || null
      } else {
        return NextResponse.json(
          { error: "created_at cannot be higher than assigned_at, started_at, or completed_at" },
          { status: 400 }
        )
      }
    }
    
    if (assigned_at !== undefined) {
      timestampMap.assigned_at = assigned_at || null
      if (validateTimestampOrder("assigned_at", assigned_at || null, timestampMap)) {
        updates.assigned_at = assigned_at || null
      } else {
        return NextResponse.json(
          { error: "assigned_at must be >= created_at and <= started_at, completed_at" },
          { status: 400 }
        )
      }
    }

    if (sqa_assigned_at !== undefined) {
      updates.sqa_assigned_at = sqa_assigned_at || null
    }
    
    if (started_at !== undefined) {
      timestampMap.started_at = started_at || null
      if (validateTimestampOrder("started_at", started_at || null, timestampMap)) {
        updates.started_at = started_at || null
      } else {
        return NextResponse.json(
          { error: "started_at must be >= created_at, assigned_at and <= completed_at" },
          { status: 400 }
        )
      }
    }
    
    if (completed_at !== undefined) {
      timestampMap.completed_at = completed_at || null
      if (validateTimestampOrder("completed_at", completed_at || null, timestampMap)) {
        updates.completed_at = completed_at || null
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
        assignee:users!tickets_assignee_id_fkey(id, name, email, role, discord_id),
        sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email, role, discord_id),
        requested_by:users!tickets_requested_by_id_fkey(id, name, email),
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

    if (status !== undefined) {
      await sendForQaDiscordNotification(supabase, ticket, previousStatus)
      await sendReturnedToDevDiscordNotification(
        supabase,
        ticket,
        previousStatus
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
    console.error("Error in PATCH /api/tickets/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
