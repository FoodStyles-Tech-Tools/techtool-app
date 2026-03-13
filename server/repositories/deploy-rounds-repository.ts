import { HttpError } from "@server/http/http-error"

type SupabaseClient = Awaited<ReturnType<typeof import("@server/lib/supabase").createServerClient>>

type DeployRoundRow = {
  id: string
  project_id: string
  name: string
  checklist: unknown
  created_at: string
  updated_at: string
}

export type DeployRoundRecord = {
  id: string
  project_id: string
  name: string
  checklist: Array<{ id: string; label: string; completed: boolean }>
  created_at: string
  updated_at: string
  has_tickets?: boolean
}

function normalizeChecklist(checklist: unknown): Array<{ id: string; label: string; completed: boolean }> {
  if (!Array.isArray(checklist)) return []
  return checklist.filter(
    (item): item is { id: string; label: string; completed: boolean } =>
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.label === "string" &&
      typeof item.completed === "boolean"
  )
}

export async function listDeployRoundsByProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<DeployRoundRecord[]> {
  const { data, error } = await supabase
    .from("deploy_rounds")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching deploy rounds:", error)
    throw new HttpError(500, "Failed to fetch deploy rounds")
  }

  return (data || []).map((row) => ({
    ...row,
    checklist: normalizeChecklist(row.checklist),
  }))
}

export async function getDeployRoundById(
  supabase: SupabaseClient,
  projectId: string,
  deployRoundId: string
): Promise<DeployRoundRecord | null> {
  const { data, error } = await supabase
    .from("deploy_rounds")
    .select("*")
    .eq("id", deployRoundId)
    .eq("project_id", projectId)
    .maybeSingle()

  if (error) {
    console.error("Error fetching deploy round:", error)
    throw new HttpError(500, "Failed to fetch deploy round")
  }

  if (!data) return null

  return {
    ...data,
    checklist: normalizeChecklist(data.checklist),
  }
}

export async function createDeployRound(
  supabase: SupabaseClient,
  input: {
    project_id: string
    name: string
    checklist: Array<{ id: string; label: string; completed: boolean }>
  }
): Promise<DeployRoundRecord> {
  const { data, error } = await supabase
    .from("deploy_rounds")
    .insert({
      project_id: input.project_id,
      name: input.name,
      checklist: input.checklist,
    })
    .select("*")
    .single()

  if (error) {
    console.error("Error creating deploy round:", error)
    throw new HttpError(500, "Failed to create deploy round")
  }

  return {
    ...data,
    checklist: normalizeChecklist(data.checklist),
  }
}

export async function updateDeployRound(
  supabase: SupabaseClient,
  projectId: string,
  deployRoundId: string,
  updates: {
    name?: string
    checklist?: Array<{ id: string; label: string; completed: boolean }>
  }
): Promise<DeployRoundRecord | null> {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.checklist !== undefined) payload.checklist = updates.checklist

  const { data, error } = await supabase
    .from("deploy_rounds")
    .update(payload)
    .eq("id", deployRoundId)
    .eq("project_id", projectId)
    .select("*")
    .maybeSingle()

  if (error) {
    console.error("Error updating deploy round:", error)
    throw new HttpError(500, "Failed to update deploy round")
  }

  if (!data) return null

  return {
    ...data,
    checklist: normalizeChecklist(data.checklist),
  }
}

export async function deleteDeployRound(
  supabase: SupabaseClient,
  projectId: string,
  deployRoundId: string
): Promise<void> {
  const { error } = await supabase
    .from("deploy_rounds")
    .delete()
    .eq("id", deployRoundId)
    .eq("project_id", projectId)

  if (error) {
    console.error("Error deleting deploy round:", error)
    throw new HttpError(500, "Failed to delete deploy round")
  }
}

export async function hasTicketsForDeployRound(
  supabase: SupabaseClient,
  deployRoundId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("deploy_round_id", deployRoundId)

  if (error) {
    console.error("Error checking tickets for deploy round:", error)
    return false
  }

  return (count ?? 0) > 0
}

export async function listDeployRoundsWithTicketCounts(
  supabase: SupabaseClient,
  projectId: string
): Promise<DeployRoundRecord[]> {
  const deployRounds = await listDeployRoundsByProject(supabase, projectId)

  const enriched = await Promise.all(
    deployRounds.map(async (deployRound) => {
      const hasTickets = await hasTicketsForDeployRound(supabase, deployRound.id)
      return {
        ...deployRound,
        has_tickets: hasTickets,
      }
    })
  )

  return enriched
}
