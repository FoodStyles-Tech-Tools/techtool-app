import type { RequestContext } from "@server/lib/auth-helpers"
import { HttpError } from "@server/http/http-error"
import * as deployRoundsRepository from "@server/repositories/deploy-rounds-repository"

export type CreateDeployRoundInput = {
  name: string
  checklist?: Array<{ id: string; label: string; completed: boolean }>
}

export type UpdateDeployRoundInput = {
  name?: string
  checklist?: Array<{ id: string; label: string; completed: boolean }>
}

const DEFAULT_CHECKLIST = [
  { id: crypto.randomUUID(), label: "Regression", completed: false },
  { id: crypto.randomUUID(), label: "Demo", completed: false },
  { id: crypto.randomUUID(), label: "SRN", completed: false },
]

export async function listDeployRounds(context: RequestContext, projectId: string) {
  const deployRounds = await deployRoundsRepository.listDeployRoundsWithTicketCounts(
    context.supabase,
    projectId
  )

  return {
    deployRounds: deployRounds.map((dr) => ({
      id: dr.id,
      projectId: dr.project_id,
      name: dr.name,
      checklist: dr.checklist,
      createdAt: dr.created_at,
      updatedAt: dr.updated_at,
      hasTickets: dr.has_tickets ?? false,
    })),
  }
}

export async function getDeployRound(context: RequestContext, projectId: string, deployRoundId: string) {
  const deployRound = await deployRoundsRepository.getDeployRoundById(
    context.supabase,
    projectId,
    deployRoundId
  )

  if (!deployRound) {
    throw new HttpError(404, "Deploy round not found")
  }

  const hasTickets = await deployRoundsRepository.hasTicketsForDeployRound(
    context.supabase,
    deployRoundId
  )

  return {
    deployRound: {
      id: deployRound.id,
      projectId: deployRound.project_id,
      name: deployRound.name,
      checklist: deployRound.checklist,
      createdAt: deployRound.created_at,
      updatedAt: deployRound.updated_at,
      hasTickets,
    },
  }
}

export async function createDeployRound(
  context: RequestContext,
  projectId: string,
  input: CreateDeployRoundInput
) {
  if (!input.name || input.name.trim().length === 0) {
    throw new HttpError(400, "Deploy round name is required")
  }

  const checklist = input.checklist && input.checklist.length > 0 ? input.checklist : DEFAULT_CHECKLIST

  const deployRound = await deployRoundsRepository.createDeployRound(context.supabase, {
    project_id: projectId,
    name: input.name.trim(),
    checklist,
  })

  return {
    deployRound: {
      id: deployRound.id,
      projectId: deployRound.project_id,
      name: deployRound.name,
      checklist: deployRound.checklist,
      createdAt: deployRound.created_at,
      updatedAt: deployRound.updated_at,
      hasTickets: false,
    },
  }
}

export async function updateDeployRound(
  context: RequestContext,
  projectId: string,
  deployRoundId: string,
  input: UpdateDeployRoundInput
) {
  if (input.name !== undefined && input.name.trim().length === 0) {
    throw new HttpError(400, "Deploy round name cannot be empty")
  }

  const updates: {
    name?: string
    checklist?: Array<{ id: string; label: string; completed: boolean }>
  } = {}

  if (input.name !== undefined) {
    updates.name = input.name.trim()
  }

  if (input.checklist !== undefined) {
    updates.checklist = input.checklist
  }

  const deployRound = await deployRoundsRepository.updateDeployRound(
    context.supabase,
    projectId,
    deployRoundId,
    updates
  )

  if (!deployRound) {
    throw new HttpError(404, "Deploy round not found")
  }

  const hasTickets = await deployRoundsRepository.hasTicketsForDeployRound(
    context.supabase,
    deployRoundId
  )

  return {
    deployRound: {
      id: deployRound.id,
      projectId: deployRound.project_id,
      name: deployRound.name,
      checklist: deployRound.checklist,
      createdAt: deployRound.created_at,
      updatedAt: deployRound.updated_at,
      hasTickets,
    },
  }
}

export async function deleteDeployRound(
  context: RequestContext,
  projectId: string,
  deployRoundId: string
) {
  const hasTickets = await deployRoundsRepository.hasTicketsForDeployRound(
    context.supabase,
    deployRoundId
  )

  if (hasTickets) {
    throw new HttpError(
      409,
      "Cannot delete deploy round with existing tickets",
      { "x-has-tickets": "true" }
    )
  }

  await deployRoundsRepository.deleteDeployRound(context.supabase, projectId, deployRoundId)

  return { success: true }
}
