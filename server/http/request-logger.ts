import { randomUUID } from "node:crypto"
import type { RequestHandler } from "express"

type LogLevel = "info" | "error"

function emitLog(level: LogLevel, message: string, data: Record<string, unknown>) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  }

  const serialized = JSON.stringify(payload)
  if (level === "error") {
    console.error(serialized)
    return
  }
  console.log(serialized)
}

export function createRequestLoggingMiddleware(): RequestHandler {
  return (request, response, next) => {
    const requestId = request.header("x-request-id") || randomUUID()
    const startedAt = Date.now()

    response.setHeader("x-request-id", requestId)
    response.locals.requestId = requestId

    response.on("finish", () => {
      if (!request.path.startsWith("/api/") && !request.path.startsWith("/auth/")) {
        return
      }

      emitLog("info", "http_request", {
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      })
    })

    next()
  }
}

export function logServerError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
) {
  emitLog("error", "server_error", {
    context,
    error: error instanceof Error ? error.message : String(error),
    ...(metadata || {}),
  })
}
