import "server-only"

import { getSupabaseWithUserContext } from "@/lib/auth-helpers"
import { sanitizeLinkArray } from "@/lib/links"
import { fetchUsersWithImages, type ServerUser } from "@/lib/server/users"

export type ServerAsset = {
  id: string
  name: string
  description: string | null
  links: string[]
  production_url: string | null
  owner: { id: string; name: string | null; email: string } | null
  owner_id: string
  collaborator_ids: string[]
  collaborators: Array<{ id: string; name: string | null; email: string; image: string | null }>
  created_at: string
}

export async function getAssetsPageData(): Promise<{
  assets: ServerAsset[]
  users: ServerUser[]
}> {
  const { supabase } = await getSupabaseWithUserContext()

  const [users, assetsResult] = await Promise.all([
    fetchUsersWithImages(supabase),
    supabase
      .from("assets")
      .select(
        "id, name, description, links, production_url, owner_id, collaborator_ids, created_at"
      )
      .order("created_at", { ascending: false }),
  ])

  if (assetsResult.error) {
    console.error("Failed to load assets:", assetsResult.error)
    return { assets: [], users }
  }

  const userMap = new Map<string, ServerUser>()
  users.forEach((user) => userMap.set(user.id, user))

  const assets: ServerAsset[] = (assetsResult.data || []).map((asset: any) => {
    const collaboratorIds = Array.isArray(asset.collaborator_ids) ? asset.collaborator_ids : []
    const collaborators = collaboratorIds
      .map((id: string) => userMap.get(id))
      .filter((user: ServerUser | undefined): user is ServerUser => Boolean(user))
      .map((user: ServerUser) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      }))

    const owner = userMap.get(asset.owner_id)

    return {
      ...asset,
      links: sanitizeLinkArray(asset.links),
      collaborator_ids: collaboratorIds,
      owner: owner
        ? { id: owner.id, name: owner.name, email: owner.email }
        : null,
      collaborators,
    }
  })

  return { assets, users }
}
