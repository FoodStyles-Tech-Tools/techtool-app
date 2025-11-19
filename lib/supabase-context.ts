"use client"

import { SupabaseClient } from "@supabase/supabase-js"
import { useSession } from "@/lib/auth-client"

// Cache for user context per client instance
// Uses WeakMap to avoid memory leaks
const contextCache = new WeakMap<SupabaseClient, { email: string | null; promise: Promise<void> | null }>()

/**
 * Ensures user context is set for RLS, but only calls RPC once per session/email change
 * This dramatically reduces database round trips
 */
export async function ensureUserContext(
  supabase: SupabaseClient,
  userEmail: string | null | undefined
): Promise<void> {
  if (!userEmail) {
    return // No user, no context needed
  }

  const cached = contextCache.get(supabase)
  
  // If email matches cached email, reuse the promise (deduplication)
  if (cached?.email === userEmail && cached.promise) {
    return cached.promise
  }

  // Create new promise for setting context
  const promise = supabase.rpc('set_user_context', { user_email: userEmail }).then(() => {
    // Update cache after successful call
    const current = contextCache.get(supabase)
    if (current) {
      current.promise = null // Clear promise after completion
    }
  }).catch((error) => {
    // On error, clear cache so we can retry
    contextCache.delete(supabase)
    throw error
  })

  // Cache the promise and email
  contextCache.set(supabase, { email: userEmail, promise })
  
  return promise
}

/**
 * Hook to get user email from session
 */
export function useUserEmail(): string | null | undefined {
  const { data: session } = useSession()
  return session?.user?.email
}

/**
 * Clear context cache (useful on logout)
 */
export function clearUserContext(supabase: SupabaseClient): void {
  contextCache.delete(supabase)
}

