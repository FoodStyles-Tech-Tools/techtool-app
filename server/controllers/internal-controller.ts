import type { Request, Response } from "express"
import { revalidateTag } from "@server/http/cache-tags"
import { parseRevalidateBody } from "@server/validation/internal"

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
