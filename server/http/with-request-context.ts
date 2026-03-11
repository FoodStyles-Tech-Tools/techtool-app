import type { RequestHandler } from "express"
import {
  createRequestContext,
  getContextResponseHeaders,
  runWithRequestContext,
} from "@/backend/compat/request-context"

export function withRequestContext(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    const requestContext = createRequestContext(request.headers.cookie)
    let appliedHeaders = false
    const originalWriteHead = response.writeHead.bind(response)

    const applyContextHeaders = () => {
      if (appliedHeaders) {
        return
      }

      appliedHeaders = true
      const headers = getContextResponseHeaders(requestContext)
      headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          response.append("Set-Cookie", value)
          return
        }
        response.setHeader(key, value)
      })
    }

    response.writeHead = ((...args: Parameters<typeof response.writeHead>) => {
      applyContextHeaders()
      return originalWriteHead(...args)
    }) as typeof response.writeHead

    void runWithRequestContext(requestContext, async () => {
      try {
        await handler(request, response, next)
        if (!response.headersSent) {
          applyContextHeaders()
        }
      } catch (error) {
        next(error)
      }
    })
  }
}
