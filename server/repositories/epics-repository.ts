import { HttpError } from "@server/http/http-error"

type SupabaseClient = Awaited<ReturnType<typeof import("@server/lib/supabase").createServerClient>>

export type EpicRecord = {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
}

const EPIC_SELECT = "id, name, description, color, created_at, updated_at"

function mapCreateError(
  error: { message?: string; code?: string; hint?: string } | null,
  options?: { projectIdProvided?: boolean }
) {
  const errorMessage = error?.message || "Failed to create epic"
  const errorCode = error?.code || error?.hint || "UNKNOWN"

  if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
    return new HttpError(
      500,
      "Epics table not found. Please run database migrations (024_create_epics.sql and 025_add_epic_id_to_tickets.sql)."
    )
  }

  if (errorMessage.includes("new row violates row-level security") || errorCode === "42501") {
    return new HttpError(403, "Permission denied. Please check RLS policies.")
  }

  if (
    errorMessage.includes('null value in column "project_id"') &&
    !options?.projectIdProvided
  ) {
    return new HttpError(
      400,
      "This workspace requires projectId when creating an epic. Create epics from a project page or include projectId in the request."
    )
  }

  return new HttpError(500, errorMessage)
}

export async function listEpics(supabase: SupabaseClient): Promise<EpicRecord[]> {
  const { data, error } = await supabase
    .from("epics")
    .select(EPIC_SELECT)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching epics:", error)
    throw new HttpError(500, "Failed to fetch epics")
  }

  return (data || []) as EpicRecord[]
}

export async function getEpicById(supabase: SupabaseClient, id: string): Promise<EpicRecord | null> {
  const { data, error } = await supabase
    .from("epics")
    .select(EPIC_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("Error fetching epic:", error)
    throw new HttpError(500, "Failed to fetch epic")
  }

  return (data as EpicRecord | null) ?? null
}

export async function createEpic(
  supabase: SupabaseClient,
  input: {
    name: string
    description: string | null
    color: string
    projectId?: string | null
  }
) {
  const baseInsert = {
    name: input.name,
    description: input.description,
    color: input.color,
  }
  const hasProjectId = typeof input.projectId === "string" && input.projectId.trim().length > 0
  const insertWithProject = hasProjectId
    ? { ...baseInsert, project_id: input.projectId }
    : baseInsert

  let { data, error } = await supabase
    .from("epics")
    .insert(insertWithProject)
    .select(EPIC_SELECT)
    .single()

  if (
    error &&
    hasProjectId &&
    error.message &&
    error.message.includes("project_id") &&
    (error.message.includes("does not exist") || error.message.includes("schema cache"))
  ) {
    const retry = await supabase
      .from("epics")
      .insert(baseInsert)
      .select(EPIC_SELECT)
      .single()
    data = retry.data
    error = retry.error
  }

  if (error || !data) {
    console.error("Error creating epic:", error)
    throw mapCreateError(error, { projectIdProvided: hasProjectId })
  }

  return data as EpicRecord
}

export async function updateEpic(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("epics")
    .update(updates)
    .eq("id", id)
    .select(EPIC_SELECT)
    .maybeSingle()

  if (error) {
    console.error("Error updating epic:", error)
    throw new HttpError(500, "Failed to update epic")
  }

  return (data as EpicRecord | null) ?? null
}

export async function deleteEpic(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("epics")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting epic:", error)
    throw new HttpError(500, "Failed to delete epic")
  }
}
