import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useMemo } from 'react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Singleton client instance for client-side use
// Using a consistent storage key to avoid multiple instances
let clientInstance: SupabaseClient | null = null

function getClientInstance(): SupabaseClient {
  if (typeof window === 'undefined') {
    // Server-side: create a new instance (won't cause the warning)
    return createClient(supabaseUrl, supabaseAnonKey)
  }

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

// Export singleton instance
export const supabase = getClientInstance()

// Server-side Supabase client for API routes
export function createServerClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )
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


