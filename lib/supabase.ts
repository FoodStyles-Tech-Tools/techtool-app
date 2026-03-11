import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "@/backend/compat/headers"

function getSupabaseUrl(): string {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.VITE_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      "Missing Supabase URL. Please set SUPABASE_URL or VITE_SUPABASE_URL environment variable."
    )
  }
  return url
}

function getSupabaseAnonKey(): string {
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      "Missing Supabase anon key. Please set SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY environment variable."
    )
  }
  return key
}

let serverFallbackClient: SupabaseClient | null = null

function getFallbackClient(): SupabaseClient {
  if (!serverFallbackClient) {
    serverFallbackClient = createClient(getSupabaseUrl(), getSupabaseAnonKey())
  }
  return serverFallbackClient
}

export function createServerClient() {
  const cookieStore = cookies()

  return createSupabaseServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
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


