import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseWithUserContext } from "@/lib/auth-helpers"

export type ServerUser = {
  id: string
  name: string | null
  email: string
  image: string | null
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
    .select("id, name, email, role, created_at")
    .order("name", { ascending: true, nullsFirst: false })

  if (error || !users?.length) {
    if (error) {
      console.error("Failed to load users:", error)
    }
    return []
  }

  const emails = users.map((user) => user.email)
  const { data: authUsers } = await supabase
    .from("auth_user")
    .select("email, image")
    .in("email", emails)

  const imageMap = new Map<string, string | null>()
  authUsers?.forEach((au) => {
    imageMap.set(au.email, au.image || null)
  })

  return users.map((user) => ({
    ...user,
    image: imageMap.get(user.email) || null,
  }))
}
