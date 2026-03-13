const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

type DiscordWebhookPayload = {
  content: string
}

export async function postToDiscordWebhook(content: string): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
    return
  }

  const payload: DiscordWebhookPayload = { content }

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
    console.error("Failed to send Discord webhook request", message.slice(0, 500))
  }
}

