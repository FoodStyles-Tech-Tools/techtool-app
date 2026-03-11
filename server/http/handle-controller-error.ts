import type { Response } from "express"
import { ZodError } from "zod"
import { HttpError } from "@/server/http/http-error"

export function handleControllerError(
  response: Response,
  error: unknown,
  context: string
) {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: error.issues[0]?.message || "Invalid request payload",
    })
    return
  }

  if (error instanceof HttpError) {
    if (error.headers) {
      Object.entries(error.headers).forEach(([key, value]) => {
        response.setHeader(key, value)
      })
    }
    response.status(error.status).json({ error: error.message })
    return
  }

  if (error instanceof Error) {
    if (error.message === "Unauthorized") {
      response.status(401).json({ error: "Unauthorized" })
      return
    }

    if (error.message.includes("Forbidden") || error.message.includes("permission")) {
      response.status(403).json({ error: error.message })
      return
    }
  }

  console.error(`${context}:`, error)
  response.status(500).json({ error: "Internal server error" })
}
