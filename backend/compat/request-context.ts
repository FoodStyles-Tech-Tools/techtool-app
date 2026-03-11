import { AsyncLocalStorage } from "node:async_hooks"
import { parse, serialize, type SerializeOptions } from "cookie"

type CookieEntry = {
  name: string
  value: string
}

type RequestContext = {
  cookies: Map<string, string>
  responseHeaders: Headers
}

const requestContext = new AsyncLocalStorage<RequestContext>()

function getContext() {
  const context = requestContext.getStore()
  if (!context) {
    throw new Error("Request context is not available.")
  }
  return context
}

export function createRequestContext(cookieHeader: string | null | undefined): RequestContext {
  const parsedCookies = parse(cookieHeader || "")
  return {
    cookies: new Map(
      Object.entries(parsedCookies).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    ),
    responseHeaders: new Headers(),
  }
}

export async function runWithRequestContext<T>(
  context: RequestContext,
  callback: () => Promise<T>
): Promise<T> {
  return requestContext.run(context, callback)
}

export function getRequestCookies(): CookieEntry[] {
  return Array.from(getContext().cookies.entries()).map(([name, value]) => ({ name, value }))
}

export function setRequestCookie(name: string, value: string, options?: SerializeOptions) {
  const context = getContext()
  context.cookies.set(name, value)
  context.responseHeaders.append("Set-Cookie", serialize(name, value, options))
}

export function getContextResponseHeaders() {
  return getContext().responseHeaders
}
