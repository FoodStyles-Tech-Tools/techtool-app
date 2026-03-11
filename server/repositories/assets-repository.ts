import { sanitizeLinkArray } from "@/lib/links"
import { HttpError } from "@/server/http/http-error"

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase").createServerClient>>

type AssetOwnerRecord = {
  id: string
  name: string | null
  email: string
} | null

type AssetBaseRecord = {
  id: string
  name: string
  description: string | null
  links: unknown
  production_url: string | null
  owner_id: string
  collaborator_ids: string[] | null
  created_at: string
  owner: AssetOwnerRecord
}

export type AssetRecord = AssetBaseRecord & {
  links: string[]
  collaborator_ids: string[]
  collaborators: Array<{
    id: string
    name: string | null
    email: string
    image: string | null
  }>
}

const ASSET_SELECT = "*, owner:users!assets_owner_id_fkey(id, name, email)"

async function fetchCollaboratorMap(
  supabase: SupabaseClient,
  collaboratorIds: string[]
) {
  if (collaboratorIds.length === 0) {
    return new Map<string, { id: string; name: string | null; email: string; image: string | null }>()
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, avatar_url")
    .in("id", collaboratorIds)

  if (error) {
    console.error("Error fetching asset collaborators:", error)
    throw new HttpError(500, "Failed to fetch assets")
  }

  return new Map(
    (data || []).map((user) => [
      user.id,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.avatar_url || null,
      },
    ])
  )
}

async function enrichAssets(
  supabase: SupabaseClient,
  assets: AssetBaseRecord[]
): Promise<AssetRecord[]> {
  if (assets.length === 0) {
    return []
  }

  const collaboratorIdSet = new Set<string>()
  assets.forEach((asset) => {
    const collaboratorIds = Array.isArray(asset.collaborator_ids) ? asset.collaborator_ids : []
    collaboratorIds.forEach((id) => {
      if (id) collaboratorIdSet.add(id)
    })
  })

  const collaboratorMap = await fetchCollaboratorMap(supabase, Array.from(collaboratorIdSet))

  return assets.map((asset) => {
    const collaboratorIds = Array.isArray(asset.collaborator_ids) ? asset.collaborator_ids : []
    return {
      ...asset,
      links: sanitizeLinkArray(asset.links),
      collaborator_ids: collaboratorIds,
      collaborators: collaboratorIds
        .map((id) => collaboratorMap.get(id))
        .filter(
          (
            collaborator
          ): collaborator is { id: string; name: string | null; email: string; image: string | null } =>
            Boolean(collaborator)
        ),
    }
  })
}

export async function listAssets(supabase: SupabaseClient): Promise<AssetRecord[]> {
  const { data, error } = await supabase
    .from("assets")
    .select(ASSET_SELECT)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching assets:", error)
    throw new HttpError(500, "Failed to fetch assets")
  }

  return enrichAssets(supabase, (data || []) as AssetBaseRecord[])
}

export async function createAsset(
  supabase: SupabaseClient,
  input: {
    name: string
    description: string | null
    links: string[]
    collaborator_ids: string[]
    owner_id: string
    production_url: string | null
  }
) {
  const { data, error } = await supabase
    .from("assets")
    .insert(input)
    .select(ASSET_SELECT)
    .single()

  if (error || !data) {
    console.error("Error creating asset:", error)
    throw new HttpError(500, error?.message || "Failed to create asset")
  }

  const [asset] = await enrichAssets(supabase, [data as AssetBaseRecord])
  return asset
}

export async function updateAsset(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("assets")
    .update(updates)
    .eq("id", id)
    .select(ASSET_SELECT)
    .maybeSingle()

  if (error) {
    console.error("Error updating asset:", error)
    throw new HttpError(500, error.message || "Failed to update asset")
  }

  if (!data) {
    return null
  }

  const [asset] = await enrichAssets(supabase, [data as AssetBaseRecord])
  return asset
}

export async function getAssetById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("assets")
    .select(ASSET_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("Error fetching asset:", error)
    throw new HttpError(500, "Failed to fetch asset")
  }

  if (!data) {
    return null
  }

  const [asset] = await enrichAssets(supabase, [data as AssetBaseRecord])
  return asset
}

export async function deleteAsset(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting asset:", error)
    throw new HttpError(500, error.message || "Failed to delete asset")
  }
}
