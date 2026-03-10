import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseWithUserContext } from "@/lib/auth-helpers"

export type ServerUser = {
  id: string
  name: string | null
  email: string
  image: string | null
  discord_id?: string | null
  role?: string | null
  created_at?: string
}

export async function getUsersWithImages(): Promise<ServerUser[]> {
  const { supabase } = await getSupabaseWithUserContext()
  return fetchUsersWithImages(supabase)
}

export async function fetchUsersWithImages(supabase: SupabaseClient): Promise<ServerUser[]> {
  const { data: users, error } = await supabase
    .from("users")
    .select("id, name, email, avatar_url, discord_id, role, created_at")
    .order("name", { ascending: true, nullsFirst: false })

  if (error || !users?.length) {
    if (error) {
      console.error("Failed to load users:", error)
    }
    return []
  }

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.avatar_url || null,
    discord_id: user.discord_id,
    role: user.role,
    created_at: user.created_at,
  }))
}
