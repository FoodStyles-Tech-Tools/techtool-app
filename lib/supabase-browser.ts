"use client"

import { createBrowserClient } from "@supabase/ssr"

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      "Missing Supabase URL. Please set NEXT_PUBLIC_SUPABASE_URL environment variable."
    )
  }
  return url
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      "Missing Supabase anon key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable."
    )
  }
  return key
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
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
