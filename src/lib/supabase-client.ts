"use client"

import { useMemo } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getBrowserSupabaseClient } from "./supabase-browser"

export function useSupabaseClient(): SupabaseClient {
  return useMemo(() => getBrowserSupabaseClient(), [])
}

export function getAuthenticatedClient(_userEmail: string | null | undefined): SupabaseClient {
  return getBrowserSupabaseClient()
}
