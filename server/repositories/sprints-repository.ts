import { HttpError } from "@/server/http/http-error"

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase").createServerClient>>

export type SprintRecord = {
  id: string
  name: string
  description: string | null
  project_id: string
  status: "planned" | "active" | "completed" | "cancelled"
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

const SPRINT_SELECT =
  "id, name, description, project_id, status, start_date, end_date, created_at, updated_at"

function mapCreateError(error: { message?: string; code?: string; hint?: string } | null) {
  const errorMessage = error?.message || "Failed to create sprint"
  const errorCode = error?.code || error?.hint || "UNKNOWN"

  if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
    return new HttpError(
      500,
      "Sprints table not found. Please run database migrations (027_add_sprints.sql)."
    )
  }

  if (errorMessage.includes("new row violates row-level security") || errorCode === "42501") {
    return new HttpError(403, "Permission denied. Please check RLS policies.")
  }

  return new HttpError(500, errorMessage)
}

export async function listSprints(
  supabase: SupabaseClient,
  projectId?: string
): Promise<SprintRecord[]> {
  let query = supabase
    .from("sprints")
    .select(SPRINT_SELECT)
    .order("created_at", { ascending: false })

  if (projectId) {
    query = query.eq("project_id", projectId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching sprints:", error)
    throw new HttpError(500, "Failed to fetch sprints")
  }

  return (data || []) as SprintRecord[]
}

export async function getSprintById(
  supabase: SupabaseClient,
  id: string
): Promise<SprintRecord | null> {
  const { data, error } = await supabase
    .from("sprints")
    .select(SPRINT_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("Error fetching sprint:", error)
    throw new HttpError(500, "Failed to fetch sprint")
  }

  return (data as SprintRecord | null) ?? null
}

export async function createSprint(
  supabase: SupabaseClient,
  input: {
    name: string
    description: string | null
    project_id: string
    status: "planned" | "active" | "completed" | "cancelled"
    start_date: string | null
    end_date: string | null
  }
) {
  const { data, error } = await supabase
    .from("sprints")
    .insert(input)
    .select(SPRINT_SELECT)
    .single()

  if (error || !data) {
    console.error("Error creating sprint:", error)
    throw mapCreateError(error)
  }

  return data as SprintRecord
}

export async function updateSprint(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("sprints")
    .update(updates)
    .eq("id", id)
    .select(SPRINT_SELECT)
    .maybeSingle()

  if (error) {
    console.error("Error updating sprint:", error)
    throw new HttpError(500, "Failed to update sprint")
  }

  return (data as SprintRecord | null) ?? null
}

export async function deleteSprint(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("sprints")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting sprint:", error)
    throw new HttpError(500, "Failed to delete sprint")
  }
}
