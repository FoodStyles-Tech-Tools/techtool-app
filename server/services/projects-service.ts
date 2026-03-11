import type { RequestContext } from "@/lib/auth-helpers"
import { prepareLinkPayload } from "@/lib/links"
import { HttpError } from "@server/http/http-error"
import * as projectsRepository from "@server/repositories/projects-repository"
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@server/validation/projects"

export async function listProjects(
  context: RequestContext,
  options: { status?: string; page?: number; limit?: number }
) {
  const { projects, count } = await projectsRepository.listProjects(context.supabase, options)

  if (!options.limit) {
    return { projects }
  }

  return {
    projects,
    pagination: {
      page: options.page || 1,
      limit: options.limit,
      total: count,
      totalPages: Math.ceil(count / options.limit),
    },
  }
}

export async function createProject(context: RequestContext, input: CreateProjectInput) {
  const project = await projectsRepository.createProject(context.supabase, {
    name: input.name,
    description: input.description || null,
    owner_id: context.userId,
    status: input.status || "active",
    department_id: input.department_id || null,
    collaborator_ids: input.collaborator_ids,
    requester_ids: input.requester_ids,
    require_sqa: input.require_sqa ?? false,
    links: prepareLinkPayload(input.links),
  })

  return { project }
}

export async function getProject(context: RequestContext, id: string) {
  const project = await projectsRepository.getProjectById(context.supabase, id)
  if (!project) {
    throw new HttpError(404, "Project not found")
  }

  const ticketStats = await projectsRepository.getProjectTicketStats(context.supabase, id)

  return {
    project: {
      ...project,
      ticket_stats: ticketStats,
    },
  }
}

export async function updateProject(
  context: RequestContext,
  id: string,
  input: UpdateProjectInput
) {
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.status !== undefined) updates.status = input.status
  if (input.department_id !== undefined) updates.department_id = input.department_id || null
  if (input.owner_id !== undefined) updates.owner_id = input.owner_id || null
  if (input.require_sqa !== undefined) updates.require_sqa = input.require_sqa
  if (input.links !== undefined) updates.links = prepareLinkPayload(input.links)
  if (input.collaborator_ids !== undefined) updates.collaborator_ids = input.collaborator_ids
  if (input.requester_ids !== undefined) updates.requester_ids = input.requester_ids

  const project = await projectsRepository.updateProject(context.supabase, id, updates)
  if (!project) {
    throw new HttpError(404, "Project not found")
  }

  const ticketStats = await projectsRepository.getProjectTicketStats(context.supabase, id)

  return {
    project: {
      ...project,
      ticket_stats: ticketStats,
    },
  }
}

export async function deleteProject(
  context: RequestContext,
  id: string,
  options: { force: boolean }
) {
  const project = await projectsRepository.getProjectById(context.supabase, id)
  if (!project) {
    throw new HttpError(404, "Project not found")
  }

  const ticketCount = await projectsRepository.countProjectTickets(context.supabase, id)
  if (ticketCount > 0 && !options.force) {
    throw new HttpError(400, "Cannot delete project with existing tickets", {
      "x-ticket-count": String(ticketCount),
    })
  }

  await projectsRepository.deleteProject(context.supabase, id)
  return { success: true }
}

export async function listPinnedProjects(context: RequestContext, ids: string[]) {
  return {
    projects: await projectsRepository.listPinnedProjects(context.supabase, ids),
  }
}
