"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getClientSupabaseAnonKey, getClientSupabaseUrl } from "@/lib/config/client-env"

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(getClientSupabaseUrl(), getClientSupabaseAnonKey(), {
      db: {
        schema: "public",
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  }

  return browserClient
}
