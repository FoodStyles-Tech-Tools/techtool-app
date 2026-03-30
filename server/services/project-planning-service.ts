import type { RequestContext } from "@server/lib/auth-helpers"
import { HttpError } from "@server/http/http-error"
import * as epicsRepository from "@server/repositories/epics-repository"
import * as sprintsRepository from "@server/repositories/sprints-repository"
import type {
  CreateEpicInput,
  CreateSprintInput,
  UpdateEpicInput,
  UpdateSprintInput,
} from "@server/validation/project-planning"

export async function listEpics(context: RequestContext) {
  return {
    epics: await epicsRepository.listEpics(context.supabase),
  }
}

export async function createEpic(context: RequestContext, input: CreateEpicInput) {
  const epic = await epicsRepository.createEpic(context.supabase, {
    name: input.name,
    description: input.description || null,
    color: input.color || "#3b82f6",
    projectId: input.projectId || null,
  })

  return { epic }
}

export async function getEpic(context: RequestContext, id: string) {
  const epic = await epicsRepository.getEpicById(context.supabase, id)
  if (!epic) {
    throw new HttpError(404, "Epic not found")
  }
  return { epic }
}

export async function updateEpic(context: RequestContext, id: string, input: UpdateEpicInput) {
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description || null
  if (input.color !== undefined) updates.color = input.color || "#3b82f6"

  const epic = await epicsRepository.updateEpic(context.supabase, id, updates)
  if (!epic) {
    throw new HttpError(404, "Epic not found")
  }
  return { epic }
}

export async function deleteEpic(context: RequestContext, id: string) {
  const existingEpic = await epicsRepository.getEpicById(context.supabase, id)
  if (!existingEpic) {
    throw new HttpError(404, "Epic not found")
  }

  await epicsRepository.deleteEpic(context.supabase, id)
  return { success: true }
}

export async function listSprints(context: RequestContext) {
  return {
    sprints: await sprintsRepository.listSprints(context.supabase),
  }
}

export async function createSprint(context: RequestContext, input: CreateSprintInput) {
  const sprint = await sprintsRepository.createSprint(context.supabase, {
    name: input.name,
    description: input.description || null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
  })

  return { sprint }
}

export async function getSprint(context: RequestContext, id: string) {
  const sprint = await sprintsRepository.getSprintById(context.supabase, id)
  if (!sprint) {
    throw new HttpError(404, "Sprint not found")
  }
  return { sprint }
}

export async function updateSprint(
  context: RequestContext,
  id: string,
  input: UpdateSprintInput
) {
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description || null
  if (input.start_date !== undefined) updates.start_date = input.start_date || null
  if (input.end_date !== undefined) updates.end_date = input.end_date || null

  const sprint = await sprintsRepository.updateSprint(context.supabase, id, updates)
  if (!sprint) {
    throw new HttpError(404, "Sprint not found")
  }
  return { sprint }
}

export async function deleteSprint(context: RequestContext, id: string) {
  const existingSprint = await sprintsRepository.getSprintById(context.supabase, id)
  if (!existingSprint) {
    throw new HttpError(404, "Sprint not found")
  }

  await sprintsRepository.deleteSprint(context.supabase, id)
  return { success: true }
}
