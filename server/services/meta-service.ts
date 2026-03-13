import { getCurrentUserWithSupabase } from "@server/lib/current-user"
import type { RequestContext } from "@server/lib/auth-helpers"
import * as metaRepository from "@server/repositories/meta-repository"

export async function listDepartments(context: RequestContext) {
  const departments = await metaRepository.listDepartments(context.supabase)
  return { departments }
}

export async function createDepartment(context: RequestContext, name: string) {
  const department = await metaRepository.createDepartment(context.supabase, name)
  return { department }
}

export async function getUserPreferences() {
  const { supabase, user } = await getCurrentUserWithSupabase()
  const preferences = await metaRepository.getUserPreferencesByUserId(supabase, user.id)

  return {
    preferences: preferences || {
      user_id: user.id,
      group_by_epic: false,
      pinned_project_ids: [],
      tickets_view: "kanban" as const,
    },
  }
}

export async function updateUserPreferences(input: {
  group_by_epic?: boolean
  pinned_project_ids?: string[]
  tickets_view?: "table" | "kanban"
}) {
  const { supabase, user } = await getCurrentUserWithSupabase()
  const existing = await metaRepository.getUserPreferencesByUserId(supabase, user.id)

  if (existing) {
    const updates: { group_by_epic?: boolean; pinned_project_ids?: string[]; tickets_view?: "table" | "kanban" } = {}
    if (input.group_by_epic !== undefined) {
      updates.group_by_epic = input.group_by_epic
    }
    if (input.pinned_project_ids !== undefined) {
      updates.pinned_project_ids = input.pinned_project_ids
    }
    if (input.tickets_view !== undefined) {
      updates.tickets_view = input.tickets_view
    }

    return {
      preferences: await metaRepository.updateUserPreferencesByUserId(supabase, user.id, updates),
    }
  }

  return {
    preferences: await metaRepository.createUserPreferences(supabase, {
      user_id: user.id,
      group_by_epic: input.group_by_epic ?? false,
      pinned_project_ids: input.pinned_project_ids ?? [],
      tickets_view: input.tickets_view ?? "kanban",
    }),
  }
}
