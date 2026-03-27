const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL?.trim() || process.env.DISCORD_WEEBHOOK_URL?.trim() || ""
const USING_LEGACY_DISCORD_WEBHOOK_KEY =
  !process.env.DISCORD_WEBHOOK_URL?.trim() && Boolean(process.env.DISCORD_WEEBHOOK_URL?.trim())

type DiscordAllowedMentions = {
  parse?: Array<"roles" | "users" | "everyone">
  users?: string[]
  roles?: string[]
}

type DiscordWebhookEmbed = {
  title?: string
  description?: string
  color?: number
  url?: string
  timestamp?: string
  fields?: Array<{
    name: string
    value: string
    inline?: boolean
  }>
  footer?: {
    text: string
  }
  author?: {
    name: string
  }
}

type DiscordWebhookPayload = {
  content?: string
  username?: string
  embeds?: DiscordWebhookEmbed[]
  allowed_mentions?: DiscordAllowedMentions
}

type DiscordWebhookInput = string | DiscordWebhookPayload

const DEFAULT_DISCORD_USERNAME = "Techtool App"
let warnedLegacyWebhookKey = false
let warnedInvalidWebhookUrl = false
let warnedMissingWebhookUrl = false

function isValidWebhookUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" && /discord(?:app)?\.com$/i.test(parsed.hostname)
  } catch {
    return false
  }
}

export async function postToDiscordWebhook(input: DiscordWebhookInput): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
    if (!warnedMissingWebhookUrl) {
      warnedMissingWebhookUrl = true
      console.warn("[discord] Missing DISCORD_WEBHOOK_URL. Notification skipped.")
    }
    return
  }

  if (USING_LEGACY_DISCORD_WEBHOOK_KEY && !warnedLegacyWebhookKey) {
    warnedLegacyWebhookKey = true
    console.warn("[discord] Using legacy env key DISCORD_WEEBHOOK_URL. Please rename to DISCORD_WEBHOOK_URL.")
  }

  if (!isValidWebhookUrl(DISCORD_WEBHOOK_URL)) {
    if (!warnedInvalidWebhookUrl) {
      warnedInvalidWebhookUrl = true
      console.error("[discord] Invalid DISCORD_WEBHOOK_URL value. Notification skipped.")
    }
    return
  }

  const payload: DiscordWebhookPayload =
    typeof input === "string"
      ? { content: input, username: DEFAULT_DISCORD_USERNAME }
      : {
          ...input,
          username: input.username || DEFAULT_DISCORD_USERNAME,
        }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      console.error("Discord webhook responded with non-2xx status", {
        status: response.status,
        body: body?.slice(0, 500),
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "Unknown error")
    console.error("Failed to send Discord webhook request", message.slice(0, 500), {
      payloadPreview: JSON.stringify(payload).slice(0, 500),
    })
  }
}

