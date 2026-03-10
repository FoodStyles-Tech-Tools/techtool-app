import "server-only"

const DISCORD_TICKET_BASE_URL = "https://techtool-app.vercel.app/tickets"

type SupabaseLike = any

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

function buildDiscordTicketLine(ticket: any): string {
  const ticketLabel = String(ticket.display_id ?? ticket.id)
  const ticketTitle = escapeDiscordMarkdown(ticket.title ?? "Untitled ticket")
  const ticketSlug = String(ticket.display_id ?? ticket.id).toLowerCase()
  const ticketUrl = `${DISCORD_TICKET_BASE_URL}/${encodeURIComponent(ticketSlug)}`
  return `[[${escapeDiscordMarkdown(ticketLabel)}] - ${ticketTitle}](${ticketUrl})`
}

async function resolveDiscordUserIdByEmail(
  supabase: SupabaseLike,
  email: string,
  logContext: string
): Promise<string | null> {
  const { data: user, error } = await supabase
    .from("users")
    .select("discord_id")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    console.error(`Failed to resolve Discord user for ${logContext}:`, error)
    return null
  }

  return user?.discord_id?.trim() || null
}

async function buildForQaDiscordContent(
  supabase: SupabaseLike,
  ticket: any,
  previousStatus: string | null | undefined
): Promise<string | null> {
  if (!process.env.DISCORD_WEBHOOK_URL) return null

  const project = normalizeRelation<{ require_sqa?: boolean }>(ticket.project)
  if (!project?.require_sqa) return null

  const currentStatus = typeof ticket.status === "string" ? ticket.status : null
  if (currentStatus !== "for_qa" || previousStatus === "for_qa") return null

  const sqaAssignee = normalizeRelation<{ role?: string; email?: string; discord_id?: string | null }>(
    ticket.sqa_assignee
  )
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

  return `Hi ${mention},\n${buildDiscordTicketLine(ticket)}\nReady for QA`
}

async function buildReturnedToDevDiscordContent(
  supabase: SupabaseLike,
  ticket: any,
  previousStatus: string | null | undefined
): Promise<string | null> {
  if (!process.env.DISCORD_WEBHOOK_URL) return null

  const project = normalizeRelation<{ require_sqa?: boolean }>(ticket.project)
  if (!project?.require_sqa) return null

  const currentStatus = typeof ticket.status === "string" ? ticket.status : null
  if (currentStatus !== "returned_to_dev" || previousStatus === "returned_to_dev") return null

  const assignee = normalizeRelation<{ role?: string; email?: string; discord_id?: string | null }>(
    ticket.assignee
  )
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

  return `Hi ${mention},\n${buildDiscordTicketLine(ticket)}\nReturned to Dev`
}

export async function enqueueTicketStatusDiscordNotifications(
  supabase: SupabaseLike,
  ticket: any,
  previousStatus: string | null | undefined
): Promise<void> {
  if (!process.env.DISCORD_WEBHOOK_URL) return

  const [forQaContent, returnedToDevContent] = await Promise.all([
    buildForQaDiscordContent(supabase, ticket, previousStatus),
    buildReturnedToDevDiscordContent(supabase, ticket, previousStatus),
  ])

  const queueRows: Array<{
    event_type: string
    payload: { content: string; ticket_id: string; status: string }
  }> = []

  if (forQaContent) {
    queueRows.push({
      event_type: "ticket_for_qa",
      payload: {
        content: forQaContent,
        ticket_id: String(ticket.id),
        status: String(ticket.status || ""),
      },
    })
  }

  if (returnedToDevContent) {
    queueRows.push({
      event_type: "ticket_returned_to_dev",
      payload: {
        content: returnedToDevContent,
        ticket_id: String(ticket.id),
        status: String(ticket.status || ""),
      },
    })
  }

  if (queueRows.length === 0) return

  const { error } = await supabase.from("discord_outbox").insert(queueRows)
  if (error) {
    console.error("Failed to enqueue Discord notifications:", error)
  }
}

export async function processDiscordOutboxBatch(
  supabase: SupabaseLike,
  limit = 20
): Promise<{
  processed: number
  sent: number
  failed: number
}> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) {
    return { processed: 0, sent: 0, failed: 0 }
  }

  const nowIso = new Date().toISOString()
  const { data: rows, error } = await supabase
    .from("discord_outbox")
    .select("id, event_type, payload, status, attempt_count")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 100)))

  if (error || !rows?.length) {
    if (error) {
      console.error("Failed to load discord outbox rows:", error)
    }
    return { processed: 0, sent: 0, failed: 0 }
  }

  let processed = 0
  let sent = 0
  let failed = 0

  for (const row of rows) {
    const nextAttemptCount = (row.attempt_count || 0) + 1
    const { data: claimed } = await supabase
      .from("discord_outbox")
      .update({
        status: "processing",
        attempt_count: nextAttemptCount,
        last_error: null,
      })
      .eq("id", row.id)
      .in("status", ["pending", "failed"])
      .select("id, payload, attempt_count")
      .maybeSingle()

    if (!claimed) continue

    processed += 1
    const content =
      typeof claimed.payload?.content === "string" ? claimed.payload.content : null
    if (!content) {
      failed += 1
      await supabase
        .from("discord_outbox")
        .update({
          status: "failed",
          last_error: "Missing Discord message content",
          next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        })
        .eq("id", claimed.id)
      continue
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })

      if (response.ok) {
        sent += 1
        await supabase
          .from("discord_outbox")
          .update({
            status: "sent",
            response_status: response.status,
            processed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", claimed.id)
      } else {
        failed += 1
        const responseText = await response.text().catch(() => "")
        const backoffMinutes = Math.min(Math.pow(2, claimed.attempt_count || 1), 60)
        await supabase
          .from("discord_outbox")
          .update({
            status: "failed",
            response_status: response.status,
            last_error: `HTTP ${response.status}: ${responseText}`.slice(0, 2000),
            next_attempt_at: new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString(),
          })
          .eq("id", claimed.id)
      }
    } catch (err: any) {
      failed += 1
      const backoffMinutes = Math.min(Math.pow(2, claimed.attempt_count || 1), 60)
      await supabase
        .from("discord_outbox")
        .update({
          status: "failed",
          last_error: String(err?.message || err || "Request error").slice(0, 2000),
          next_attempt_at: new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString(),
        })
        .eq("id", claimed.id)
    }
  }

  return { processed, sent, failed }
}
