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
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })
    .format(parsed)
    .replace(",", "") + " UTC"
}

function resolveDisplayName(
  user: { name?: string | null; email?: string | null } | null | undefined,
  fallback: string
) {
  return (user?.name || user?.email || fallback).trim()
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

function truncateForDiscord(value: string, maxLength = 1000) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1)}…`
}

function buildTicketCreatedEmbed(args: {
  isBug: boolean
  reporterLabel: string
  ticketTitle: string
  ticketLink: string
  priorityLabel: string
  dueDateLabel: string
  submitterEmail: string
  assigneeLabel?: string
}) {
  const description = args.assigneeLabel
    ? args.isBug
      ? `**${args.reporterLabel}** has reported a **BUG**.`
      : `**${args.reporterLabel}** has requested a **feature**.`
    : `A new **${args.isBug ? "Bug" : "Feature"}** ticket is available to pull.`

  const fields = [
    { name: "Reporter", value: truncateForDiscord(args.reporterLabel), inline: true },
    { name: "Priority", value: `\`${truncateForDiscord(args.priorityLabel, 64)}\``, inline: true },
    { name: "Due Date", value: `\`${truncateForDiscord(args.dueDateLabel, 64)}\``, inline: true },
    ...(args.assigneeLabel
      ? [{ name: "Assignee", value: truncateForDiscord(args.assigneeLabel), inline: true }]
      : [{ name: "Type", value: args.isBug ? "Bug" : "Feature", inline: true }]),
    { name: "Ticket Title", value: truncateForDiscord(args.ticketTitle, 512), inline: false },
    { name: "Link", value: `[Open Ticket](${args.ticketLink})`, inline: false },
  ]

  return {
    title: args.isBug ? "New Bug Ticket" : "New Feature Request",
    description,
    color: args.isBug ? DISCORD_EMBED_BUG_COLOR : DISCORD_EMBED_REQUEST_COLOR,
    url: args.ticketLink,
    fields,
    footer: {
      text: `submitted by: ${args.submitterEmail || "Unknown"} | via: Techtool App`,
    },
    author: {
      name: "Techtool App",
    },
    timestamp: new Date().toISOString(),
  }
}

export async function notifyTicketCreated(
  ticket: TicketWithRelations,
  submitterEmail: string | null | undefined
) {
  const reporterId = ticket.requested_by_id || ticket.requested_by?.id || null
  const assigneeId = ticket.assignee_id || ticket.assignee?.id || null
  const isReporterAssignee = Boolean(reporterId && assigneeId && reporterId === assigneeId)

  if (isReporterAssignee) {
    console.info("[discord] Ticket create notification skipped: reporter equals assignee", {
      ticketId: ticket.id,
      reporterId,
      assigneeId,
    })
    return
  }

  const reporterLabel = resolveDisplayName(ticket.requested_by, "Unknown Reporter")
  const isBug = isBugTicket(resolveTicketType(ticket))
  const ticketLink = buildTicketUrl(ticket)
  const ticketTitle = ticket.title || "Untitled ticket"
  const priorityLabel = normalizePriorityLabel(ticket.priority)
  const dueDateLabel = formatDueDate(ticket.due_date ?? ticket.dueDate ?? null)
  const safeSubmitterEmail = submitterEmail || "Unknown"

  if (assigneeId) {
    const assigneeMention = buildDiscordUserMention(ticket.assignee?.discord_id ?? null)
    const assigneeLabel = assigneeMention || resolveDisplayName(ticket.assignee, "Unknown Assignee")

    await postToDiscordWebhook({
      content: assigneeMention ? `Hi ${assigneeMention}` : undefined,
      embeds: [
        buildTicketCreatedEmbed({
          isBug,
          reporterLabel,
          ticketTitle,
          ticketLink,
          priorityLabel,
          dueDateLabel,
          submitterEmail: safeSubmitterEmail,
          assigneeLabel,
        }),
      ],
      allowed_mentions: {
        parse: ["users", "roles"],
      },
    })
    return
  }

  const roleMention = buildDiscordRoleMention(process.env.DISCORD_ROLE_ID ?? null)

  await postToDiscordWebhook({
    content: `Hi ${roleMention ?? "team"} a new ticket available to PULL!`,
    embeds: [
      buildTicketCreatedEmbed({
        isBug,
        reporterLabel,
        ticketTitle,
        ticketLink,
        priorityLabel,
        dueDateLabel,
        submitterEmail: safeSubmitterEmail,
      }),
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

