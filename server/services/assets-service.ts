import type { RequestContext } from "@/lib/auth-helpers"
import { prepareLinkPayload } from "@/lib/links"
import { HttpError } from "@server/http/http-error"
import * as assetsRepository from "@server/repositories/assets-repository"
import type { CreateAssetInput, UpdateAssetInput } from "@server/validation/assets"

function normalizeAssetUpdates(input: UpdateAssetInput) {
  const updates: Record<string, unknown> = {}

  if (input.name !== undefined) {
    updates.name = input.name
  }
  if (input.description !== undefined) {
    updates.description = input.description || null
  }
  if (input.production_url !== undefined) {
    updates.production_url = input.production_url || null
  }
  if (input.links !== undefined) {
    updates.links = prepareLinkPayload(input.links)
  }
  if (input.collaborator_ids !== undefined) {
    updates.collaborator_ids = input.collaborator_ids
  }
  if (input.owner_id !== undefined) {
    updates.owner_id = input.owner_id || null
  }

  return updates
}

export async function listAssets(context: RequestContext) {
  return {
    assets: await assetsRepository.listAssets(context.supabase),
  }
}

export async function createAsset(context: RequestContext, input: CreateAssetInput) {
  const asset = await assetsRepository.createAsset(context.supabase, {
    name: input.name,
    description: input.description || null,
    links: prepareLinkPayload(input.links),
    collaborator_ids: input.collaborator_ids,
    owner_id: input.owner_id || context.userId,
    production_url: input.production_url || null,
  })

  return { asset }
}

export async function updateAsset(
  context: RequestContext,
  id: string,
  input: UpdateAssetInput
) {
  const asset = await assetsRepository.updateAsset(
    context.supabase,
    id,
    normalizeAssetUpdates(input)
  )

  if (!asset) {
    throw new HttpError(404, "Asset not found")
  }

  return { asset }
}

export async function deleteAsset(context: RequestContext, id: string) {
  const existingAsset = await assetsRepository.getAssetById(context.supabase, id)
  if (!existingAsset) {
    throw new HttpError(404, "Asset not found")
  }

  await assetsRepository.deleteAsset(context.supabase, id)
  return { success: true }
}
