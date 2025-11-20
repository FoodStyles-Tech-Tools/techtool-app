import { requireAuth } from "./auth-helpers"
import { createServerClient } from "./supabase"

export async function getCurrentUserWithSupabase() {
  const session = await requireAuth()
  const supabase = createServerClient()
  const { data: user, error } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", session.user.email)
    .single()

  if (error || !user) {
    throw new Error("User record not found")
  }

  return { session, supabase, user }
}
