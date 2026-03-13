import type { SupabaseClient } from "@supabase/supabase-js"
import { postToDiscordWebhook } from "@server/lib/discord-webhook"

const DISCORD_TICKET_BASE_URL = "https://techtool-app.vercel.app/tickets"

type TicketWithRelations = {
  id: string
  display_id?: string | number | null
  title?: string | null
  status?: string | null
  assignee_id?: string | null
  sqa_assignee_id?: string | null
  assignee?: {
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

function escapeDiscordMarkdown(value: string) {
  return value.replace(/([\\\[\]])/g, "\\$1")
}

function buildDiscordTicketMarkdown(ticket: TicketWithRelations) {
  const ticketLabel = String(ticket.display_id ?? ticket.id ?? "")
  const ticketTitle = escapeDiscordMarkdown(ticket.title ?? "Untitled ticket")
  const ticketSlug = String(ticket.display_id ?? ticket.id).toLowerCase()
  const ticketUrl = `${DISCORD_TICKET_BASE_URL}/${encodeURIComponent(ticketSlug)}`

  return `[[${escapeDiscordMarkdown(ticketLabel)}] - ${ticketTitle}](${ticketUrl})`
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

