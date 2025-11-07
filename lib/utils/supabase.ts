/**
 * Utility functions for Supabase configuration and credentials
 */

import { createClient } from "@supabase/supabase-js";

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

/**
 * Retrieves Supabase credentials from environment variables
 * @throws Error if credentials are not configured
 * @returns Object containing url and anonKey
 */
export function getSupabaseCredentials(): SupabaseCredentials {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!url || !anonKey) {
    throw new Error(
      "Supabase credentials are not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
    );
  }

  return { url, anonKey };
}

/**
 * Creates a Supabase client for server-side operations
 * @returns Configured Supabase client
 */
export function getSupabaseServerClient() {
  const { url, anonKey } = getSupabaseCredentials();
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

