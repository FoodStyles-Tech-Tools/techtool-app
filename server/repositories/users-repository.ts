import { HttpError } from "@/server/http/http-error"

export type UserRecord = {
  id: string
  name: string | null
  email: string
  avatar_url: string | null
  discord_id: string | null
  role: string | null
  created_at: string
}

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase").createServerClient>>

export async function listUsers(supabase: SupabaseClient): Promise<UserRecord[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, avatar_url, discord_id, role, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching users:", error)
    throw new HttpError(500, "Failed to fetch users")
  }

  return (data || []) as UserRecord[]
}

export async function getUserById(supabase: SupabaseClient, id: string): Promise<UserRecord | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, avatar_url, discord_id, role, created_at")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("Error fetching user:", error)
    throw new HttpError(500, "Failed to fetch user")
  }

  return (data as UserRecord | null) ?? null
}

export async function getUserByEmail(supabase: SupabaseClient, email: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    console.error("Error fetching user by email:", error)
    throw new HttpError(500, "Failed to fetch user")
  }

  return data
}

export async function getRoleByName(supabase: SupabaseClient, roleName: string) {
  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .ilike("name", roleName)
    .maybeSingle()

  if (error) {
    console.error("Error validating role:", error)
    throw new HttpError(500, "Failed to validate role")
  }

  return data
}

export async function createUser(
  supabase: SupabaseClient,
  input: {
    email: string
    name: string | null
    role: string
    discord_id: string | null
  }
) {
  const { data, error } = await supabase
    .from("users")
    .insert(input)
    .select("id")
    .single()

  if (error || !data?.id) {
    console.error("Error creating user:", error)
    throw new HttpError(500, "Failed to create user")
  }

  return data
}

export async function updateUser(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)

  if (error) {
    console.error("Error updating user:", error)
    throw new HttpError(500, "Failed to update user")
  }
}

export async function deleteUser(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting user:", error)
    throw new HttpError(500, "Failed to delete user")
  }
}
