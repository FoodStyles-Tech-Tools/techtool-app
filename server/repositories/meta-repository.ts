import { HttpError } from "@server/http/http-error"

type SupabaseClient = Awaited<ReturnType<typeof import("@server/lib/supabase").createServerClient>>

export type DepartmentRecord = {
  id: string
  name: string
}

type UserPreferencesRow = {
  user_id: unknown
  group_by_epic: unknown
  pinned_project_ids: unknown
  tickets_view?: unknown
}

export type UserPreferencesRecord = {
  user_id: string
  group_by_epic: boolean
  pinned_project_ids: string[]
  tickets_view: "table" | "kanban"
}

function sanitizePreferences(preferences: UserPreferencesRow): UserPreferencesRecord {
  const ticketsView = preferences.tickets_view === "kanban" ? "kanban" : "table"
  return {
    user_id: typeof preferences.user_id === "string" ? preferences.user_id : "",
    group_by_epic: preferences.group_by_epic === true,
    pinned_project_ids: Array.isArray(preferences.pinned_project_ids)
      ? (preferences.pinned_project_ids as string[])
      : [],
    tickets_view: ticketsView,
  }
}

export async function listDepartments(supabase: SupabaseClient): Promise<DepartmentRecord[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching departments:", error)
    throw new HttpError(500, "Failed to fetch departments")
  }

  return (data || []) as DepartmentRecord[]
}

export async function createDepartment(supabase: SupabaseClient, name: string) {
  const { data, error } = await supabase
    .from("departments")
    .insert({ name })
    .select("*")
    .single()

  if (error || !data) {
    console.error("Error creating department:", error)
    const message =
      error?.code === "23505" ? "A department with this name already exists" : "Failed to create department"
    throw new HttpError(500, message)
  }

  return data as DepartmentRecord
}

export async function getUserPreferencesByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferencesRecord | null> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching user preferences:", error)
    throw new HttpError(500, "Failed to fetch user preferences")
  }

  if (!data) {
    return null
  }

  return sanitizePreferences(data as UserPreferencesRow)
}

export async function updateUserPreferencesByUserId(
  supabase: SupabaseClient,
  userId: string,
  updates: { group_by_epic?: boolean; pinned_project_ids?: string[]; tickets_view?: "table" | "kanban" }
): Promise<UserPreferencesRecord> {
  const { data, error } = await supabase
    .from("user_preferences")
    .update(updates)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error || !data) {
    console.error("Error updating user preferences:", error)
    throw new HttpError(500, "Failed to update user preferences")
  }

  return sanitizePreferences(data as UserPreferencesRow)
}

export async function createUserPreferences(
  supabase: SupabaseClient,
  input: { user_id: string; group_by_epic: boolean; pinned_project_ids: string[]; tickets_view?: "table" | "kanban" }
): Promise<UserPreferencesRecord> {
  const { data, error } = await supabase
    .from("user_preferences")
    .insert(input)
    .select("*")
    .single()

  if (error || !data) {
    console.error("Error creating user preferences:", error)
    throw new HttpError(500, "Failed to create user preferences")
  }

  return sanitizePreferences(data as UserPreferencesRow)
}
