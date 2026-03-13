import { z } from "zod"

const revalidateBodySchema = z.object({
  tags: z.array(z.unknown()).optional(),
})

export function parseRevalidateBody(input: unknown) {
  const parsed = revalidateBodySchema.parse(input)
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.filter((tag): tag is string => typeof tag === "string" && !!tag.trim())
    : []

  return { tags }
}
