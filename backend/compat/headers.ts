import { getRequestCookies, setRequestCookie } from "./request-context"

export function cookies() {
  return {
    getAll() {
      return getRequestCookies()
    },
    set(name: string, value: string, options?: Record<string, unknown>) {
      setRequestCookie(name, value, options)
    },
  }
}
