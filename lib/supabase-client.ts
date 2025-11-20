"use client"

import { useMemo } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

// Lazy getter for Supabase URL with fallback
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      'Missing Supabase URL. Please set NEXT_PUBLIC_SUPABASE_URL environment variable.'
    )
  }
  return url
}

// Lazy getter for Supabase anon key with fallback
function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      'Missing Supabase anon key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.'
    )
  }
  return key
}

// Singleton client instance for client-side use
// Using a consistent storage key to avoid multiple instances
let clientInstance: SupabaseClient | null = null

function getClientInstance(): SupabaseClient {
  // Lazy validation - only check when actually needed
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  // Client-side: use singleton pattern
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'sb-auth-token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  }
  return clientInstance
}

// Client-side authenticated Supabase client hook
// Returns the singleton instance - all components share the same client
// Queries should call set_user_context before executing for RLS
export function useSupabaseClient(): SupabaseClient {
  return useMemo(() => {
    return getClientInstance()
  }, [])
}

// Helper to get authenticated client with user email
// Uses the singleton instance and sets headers dynamically
export function getAuthenticatedClient(userEmail: string | null | undefined): SupabaseClient {
  const client = getClientInstance()
  
  // If we need to set user email, we can do it via RPC calls instead of creating new clients
  // The singleton client will be used, and set_user_context RPC will handle authentication
  return client
}

