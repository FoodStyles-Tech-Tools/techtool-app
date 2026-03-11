import { z } from "zod"

const revalidateBodySchema = z.object({
  tags: z.array(z.unknown()).optional(),
})

const discordOutboxBodySchema = z.object({
  limit: z.unknown().optional(),
})

export function parseRevalidateBody(input: unknown) {
  const parsed = revalidateBodySchema.parse(input)
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.filter((tag): tag is string => typeof tag === "string" && !!tag.trim())
    : []

  return { tags }
}

export function parseDiscordOutboxBody(input: unknown) {
  const parsed = discordOutboxBodySchema.parse(input)
  const limit = Number(parsed.limit || 20)
  const clampedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 20
  return { limit: clampedLimit }
}
