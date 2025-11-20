import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy getter for Supabase URL with fallback
function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      'Missing Supabase URL. Please set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable.'
    )
  }
  return url
}

// Lazy getter for Supabase anon key with fallback
function getSupabaseAnonKey(): string {
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      'Missing Supabase anon key. Please set SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.'
    )
  }
  return key
}

// Lazy getter for singleton instance - only creates when accessed
// This will be initialized on first access, not at module load time
let _supabaseInstance: SupabaseClient | null = null
function getSupabaseInstance(): SupabaseClient {
  if (!_supabaseInstance) {
    const url = getSupabaseUrl()
    const key = getSupabaseAnonKey()
    _supabaseInstance = createClient(url, key)
  }
  return _supabaseInstance
}

// Export as a Proxy to ensure lazy initialization
// This prevents module-level execution during build
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getSupabaseInstance()
    return (instance as any)[prop]
  },
  set(_target, prop, value) {
    const instance = getSupabaseInstance()
    ;(instance as any)[prop] = value
    return true
  },
})

// Server-side Supabase client for API routes
// Falls back to NEXT_PUBLIC_* vars if server vars aren't set (for Vercel compatibility)
export function createServerClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  return createClient(url, key)
}


