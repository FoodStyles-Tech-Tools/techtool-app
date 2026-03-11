import type { Request, Response } from "express"
import { createServerClient } from "@/lib/supabase"
import { processDiscordOutboxBatch } from "@/lib/server/discord-outbox"
import { revalidateTag } from "@server/http/cache-tags"
import { parseDiscordOutboxBody, parseRevalidateBody } from "@server/validation/internal"

export async function revalidateController(request: Request, response: Response) {
  try {
    const expectedToken = process.env.INTERNAL_REVALIDATE_TOKEN
    if (!expectedToken) {
      response.status(503).json({ error: "Revalidation token is not configured" })
      return
    }

    const receivedToken = request.headers["x-internal-revalidate-token"]
    if (receivedToken !== expectedToken) {
      response.status(401).json({ error: "Unauthorized" })
      return
    }

    const { tags } = parseRevalidateBody(request.body)
    if (tags.length === 0) {
      response.status(400).json({ error: "At least one cache tag is required" })
      return
    }

    for (const tag of tags) {
      revalidateTag(tag)
    }

    response.json({ revalidated: tags })
  } catch (error) {
    console.error("Error in POST /api/v2/revalidate:", error)
    response.status(500).json({ error: "Internal server error" })
  }
}

export async function processDiscordOutboxController(request: Request, response: Response) {
  try {
    const expectedToken = process.env.INTERNAL_CRON_TOKEN
    if (!expectedToken) {
      response.status(503).json({ error: "Internal cron token is not configured" })
      return
    }

    const authHeader = request.headers.authorization
    if (authHeader !== `Bearer ${expectedToken}`) {
      response.status(401).json({ error: "Unauthorized" })
      return
    }

    const { limit } = parseDiscordOutboxBody(request.body)
    const supabase = createServerClient()
    const result = await processDiscordOutboxBatch(supabase, limit)
    response.json(result)
  } catch (error) {
    console.error("Error in POST /api/internal/discord-outbox/process:", error)
    response.status(500).json({ error: "Internal server error" })
  }
}
