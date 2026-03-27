const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

type DiscordAllowedMentions = {
  parse?: Array<"roles" | "users" | "everyone">
  users?: string[]
  roles?: string[]
}

type DiscordWebhookEmbed = {
  title?: string
  description?: string
  color?: number
}

type DiscordWebhookPayload = {
  content?: string
  username?: string
  embeds?: DiscordWebhookEmbed[]
  allowed_mentions?: DiscordAllowedMentions
}

type DiscordWebhookInput = string | DiscordWebhookPayload

const DEFAULT_DISCORD_USERNAME = "Techtool App"

export async function postToDiscordWebhook(input: DiscordWebhookInput): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
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

