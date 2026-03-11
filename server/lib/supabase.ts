import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "@server/http/headers"
import { getServerSupabaseAnonKey, getServerSupabaseUrl } from "./server-env"

let serverFallbackClient: SupabaseClient | null = null

function getFallbackClient(): SupabaseClient {
  if (!serverFallbackClient) {
    serverFallbackClient = createClient(getServerSupabaseUrl(), getServerSupabaseAnonKey())
  }
  return serverFallbackClient
}

export function createServerClient() {
  const cookieStore = cookies()

  return createSupabaseServerClient(getServerSupabaseUrl(), getServerSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot always write cookies. Middleware refreshes auth cookies.
        }
      },
    },
  })
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getFallbackClient()
    return (instance as never as Record<string, unknown>)[prop as keyof SupabaseClient]
  },
  set(_target, prop, value) {
    const instance = getFallbackClient() as never as Record<string, unknown>
    instance[prop as string] = value
    return true
  },
})


