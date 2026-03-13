import { getClientBackendUrl } from "./config/client-env"

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }
}

export function createQueryString(params: Record<string, string | number | boolean | null | undefined>) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return
    }
    searchParams.set(key, String(value))
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let resolvedInput: RequestInfo | URL = input

  if (typeof input === "string" && input.startsWith("/")) {
    const backendBase = getClientBackendUrl()
    resolvedInput = new URL(input, backendBase).toString()
  }

  const response = await fetch(resolvedInput, init)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      typeof (payload as { error?: unknown })?.error === "string"
        ? ((payload as { error: string }).error)
        : `Request failed with status ${response.status}`
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}
