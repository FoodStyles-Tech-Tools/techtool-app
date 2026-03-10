import "server-only"

import { mapSupabaseUserToSession } from "@/lib/auth-session"
import { createServerClient } from "@/lib/supabase"

async function getSession() {
  const supabase = createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return mapSupabaseUserToSession(user)
}

export const auth = {
  api: {
    async getSession(_options?: unknown) {
      return getSession()
    },
  },
}

export function getAuth() {
  return auth
}
