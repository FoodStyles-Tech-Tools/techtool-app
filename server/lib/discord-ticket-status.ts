import type { SupabaseClient } from "@supabase/supabase-js"
import { postToDiscordWebhook } from "@server/lib/discord-webhook"

const APP_BASE_URL = (process.env.APP_URL || "https://techtool-app.vercel.app").replace(/\/+$/, "")
const DISCORD_TICKET_BASE_URL = `${APP_BASE_URL}/tickets`
const DISCORD_EMBED_BUG_COLOR = 0xdc2626
const DISCORD_EMBED_REQUEST_COLOR = 0x2563eb

type TicketWithRelations = {
  id: string
  display_id?: string | number | null
  displayId?: string | number | null
  title?: string | null
  status?: string | null
  priority?: string | null
  type?: string | null
  due_date?: string | null
  dueDate?: string | null
  requested_by_id?: string | null
  assignee_id?: string | null
  sqa_assignee_id?: string | null
  requested_by?: {
    id?: string | null
    name?: string | null
    email?: string | null
  } | null
  assignee?: {
    id?: string | null
    name?: string | null
    email?: string | null
    discord_id?: string | null
  } | null
  sqa_assignee?: {
    discord_id?: string | null
  } | null
}

function buildDiscordUserMention(discordId: string | null | undefined) {
  const trimmed = discordId?.trim()
  if (!trimmed) return null
  return `<@${trimmed}>`
}

function buildDiscordRoleMention(roleId: string | null | undefined) {
  const trimmed = roleId?.trim()
  if (!trimmed) return null
  return `<@&${trimmed}>`
}

function isBugTicket(type: string | null | undefined) {
  return (type || "").trim().toLowerCase() === "bug"
}

function normalizeTicketTypeLabel(type: string | null | undefined) {
  return isBugTicket(type) ? "Bug" : "Feature"
}

function normalizePriorityLabel(priority: string | null | undefined) {
  const normalized = (priority || "").trim().toLowerCase()
  if (!normalized) return "Medium"
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function formatDueDate(dueDate: string | null | undefined) {
  if (!dueDate) return "No Due Date"
  const parsed = new Date(dueDate)
  if (Number.isNaN(parsed.getTime())) {
    return dueDate
  }
  return parsed.toISOString().replace("T", " ").replace(".000Z", " UTC")
}

function resolveDisplayName(user: { name?: string | null; email?: string | null } | null | undefined) {
  return (user?.name || user?.email || "Unknown Reporter").trim()
}

function resolveTicketType(ticket: TicketWithRelations) {
  return ticket.type || null
}

function escapeDiscordMarkdown(value: string) {
  return value.replace(/([\\\[\]])/g, "\\$1")
}

function buildDiscordTicketMarkdown(ticket: TicketWithRelations) {
  const ticketLabel = String(ticket.display_id ?? ticket.displayId ?? ticket.id ?? "")
  const ticketTitle = escapeDiscordMarkdown(ticket.title ?? "Untitled ticket")
  const ticketSlug = String(ticket.display_id ?? ticket.displayId ?? ticket.id).toLowerCase()
  const ticketUrl = `${DISCORD_TICKET_BASE_URL}/${encodeURIComponent(ticketSlug)}`

  return `[[${escapeDiscordMarkdown(ticketLabel)}] - ${ticketTitle}](${ticketUrl})`
}

function buildTicketUrl(ticket: TicketWithRelations) {
  const ticketSlug = String(ticket.display_id ?? ticket.displayId ?? ticket.id).toLowerCase()
  return `${DISCORD_TICKET_BASE_URL}/${encodeURIComponent(ticketSlug)}`
}

export async function notifyTicketCreated(
  ticket: TicketWithRelations,
  submitterEmail: string | null | undefined
) {
  const reporterId = ticket.requested_by_id || ticket.requested_by?.id || null
  const assigneeId = ticket.assignee_id || ticket.assignee?.id || null
  const isReporterAssignee = Boolean(reporterId && assigneeId && reporterId === assigneeId)

  if (isReporterAssignee) {
    return
  }

  const reporterLabel = resolveDisplayName(ticket.requested_by)
  const isBug = isBugTicket(resolveTicketType(ticket))
  const embedColor = isBug ? DISCORD_EMBED_BUG_COLOR : DISCORD_EMBED_REQUEST_COLOR
  const ticketLink = buildTicketUrl(ticket)
  const priorityLabel = normalizePriorityLabel(ticket.priority)
  const dueDateLabel = formatDueDate(ticket.due_date ?? ticket.dueDate ?? null)

  if (assigneeId) {
    const assigneeMention = buildDiscordUserMention(ticket.assignee?.discord_id ?? null)
    const assigneeLabel = assigneeMention || resolveDisplayName(ticket.assignee) || "Unknown Assignee"
    const summary = isBug
      ? `${reporterLabel} has reported a BUG`
      : `${reporterLabel} has requested a feature`

    const content = [
      summary,
      `Ticket Title: ${ticket.title || "Untitled ticket"}`,
      `Link: ${ticketLink}`,
      `Priority: ${priorityLabel}`,
      `Due Date: ${dueDateLabel}`,
      `Assignee: ${assigneeLabel}`,
      "",
      `submitted by: ${submitterEmail || "Unknown"} | via: Techtool App`,
    ].join("\n")

    await postToDiscordWebhook({
      content,
      embeds: [
        {
          title: isBug ? "New Bug Ticket" : "New Feature Request",
          color: embedColor,
        },
      ],
      allowed_mentions: {
        parse: ["users", "roles"],
      },
    })
    return
  }

  const roleMention = buildDiscordRoleMention(process.env.DISCORD_ROLE_ID ?? null)
  const content = [
    `Hi ${roleMention ?? "team"} a new ticket available to PULL!`,
    `Reporter: ${reporterLabel}`,
    `Type: ${normalizeTicketTypeLabel(resolveTicketType(ticket))}`,
    `Ticket Title: ${ticket.title || "Untitled ticket"}`,
    `Link: ${ticketLink}`,
    `Priority: ${priorityLabel}`,
    `Due Date: ${dueDateLabel}`,
    "",
    `submitted by: ${submitterEmail || "Unknown"} | via: Techtool App`,
  ].join("\n")

  await postToDiscordWebhook({
    content,
    embeds: [
      {
        title: isBug ? "Unassigned Bug Ticket" : "Unassigned Feature Ticket",
        color: embedColor,
      },
    ],
    allowed_mentions: {
      parse: ["users", "roles"],
    },
  })
}

export async function notifyTicketForQa(
  supabase: SupabaseClient,
  ticket: TicketWithRelations,
  previousStatus: string | null | undefined
) {
  const currentStatus = typeof ticket.status === "string" ? ticket.status : null
  if (currentStatus !== "for_qa" || previousStatus === "for_qa") return

  const ticketLine = buildDiscordTicketMarkdown(ticket)

  if (!ticket.sqa_assignee_id) {
    const roleMention = buildDiscordRoleMention(process.env.DISCORD_ROLE_SQA ?? null)
    const mention = roleMention ?? "SQA"
    const content = `Hi ${mention}\n${ticketLine}\n\`Ready for Qa\``
    await postToDiscordWebhook(content)
    return
  }

  const userMention = buildDiscordUserMention(ticket.sqa_assignee?.discord_id ?? null)
  const mention = userMention ?? "SQA"
  const content = `Hi ${mention}\n${ticketLine}\n\`Ready for Qa\``
  await postToDiscordWebhook(content)
}

export async function notifyTicketReturnedToDev(
  supabase: SupabaseClient,
  ticket: TicketWithRelations,
  previousStatus: string | null | undefined
) {
  const currentStatus = typeof ticket.status === "string" ? ticket.status : null
  if (currentStatus !== "returned_to_dev" || previousStatus === "returned_to_dev") return

  const ticketLine = buildDiscordTicketMarkdown(ticket)
  const userMention = buildDiscordUserMention(ticket.assignee?.discord_id ?? null)
  const mention = userMention ?? "Assignee"
  const content = `Hi ${mention}\n${ticketLine}\n\`Returned to Dev\``
  await postToDiscordWebhook(content)
}

export async function notifyBatchTicketStatus(
  status: "for_qa" | "returned_to_dev",
  tickets: TicketWithRelations[]
) {
  if (!tickets.length) return

  const filtered = tickets.filter((ticket) => ticket.status === status)
  if (!filtered.length) return

  const lines = filtered.map((ticket) => `- ${buildDiscordTicketMarkdown(ticket)}`)
  const statusLabel = status === "for_qa" ? "`Ready for Qa`" : "`Returned to Dev`"

  const header =
    status === "for_qa"
      ? `Hi ${buildDiscordRoleMention(process.env.DISCORD_ROLE_SQA ?? null) ?? "SQA"}`
      : "Hi"

  const content = `${header}\n${statusLabel}\n${lines.join("\n")}`
  await postToDiscordWebhook(content)
}

