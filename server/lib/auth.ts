import { mapSupabaseUserToSession } from "@shared/auth-session"
import { createServerClient } from "./supabase"

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

