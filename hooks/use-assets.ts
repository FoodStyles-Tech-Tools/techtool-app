"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSupabaseClient } from "@/lib/supabase-client"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"

const sanitizeLinkArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((url) => url.length > 0)
}

const prepareLinkPayload = (links?: string[]): string[] => {
  if (!links) return []
  return links.map((link) => link.trim()).filter(Boolean)
}

export interface AssetOwner {
  id: string
  name: string | null
  email: string
}

export interface AssetCollaborator {
  id: string
  name: string | null
  email: string
  image: string | null
}

export interface Asset {
  id: string
  name: string
  description: string | null
  links: string[]
  production_url: string | null
  owner: AssetOwner | null
  owner_id: string
  collaborator_ids: string[]
  collaborators: AssetCollaborator[]
  created_at: string
}

async function attachCollaboratorsToAssets(
  supabase: ReturnType<typeof useSupabaseClient>,
  assets: any[]
): Promise<any[]> {
  if (!assets?.length) return assets

  const collaboratorIds = new Set<string>()
  assets.forEach((asset) => {
    const ids: string[] = asset.collaborator_ids || []
    ids.forEach((id) => {
      if (id) collaboratorIds.add(id)
    })
  })

  if (collaboratorIds.size === 0) {
    return assets.map((asset) => ({
      ...asset,
      collaborator_ids: asset.collaborator_ids || [],
      collaborators: [],
    }))
  }

  const { data: collaboratorUsers } = await supabase
    .from("users")
    .select("id, name, email")
    .in("id", Array.from(collaboratorIds))

  const emails = collaboratorUsers?.map((user) => user.email) || []
  const { data: authUsers } = await supabase
    .from("auth_user")
    .select("email, image")
    .in("email", emails)

  const imageMap = new Map<string, string | null>()
  authUsers?.forEach((au) => {
    imageMap.set(au.email, au.image || null)
  })

  const collaboratorMap = new Map<string, AssetCollaborator>()
  collaboratorUsers?.forEach((user) => {
    collaboratorMap.set(user.id, {
      ...user,
      image: imageMap.get(user.email) || null,
    })
  })

  return assets.map((asset) => {
    const ids: string[] = asset.collaborator_ids || []
    const collaborators = ids.map((id) => collaboratorMap.get(id)).filter(Boolean)
    return {
      ...asset,
      collaborator_ids: ids,
      collaborators,
    }
  })
}

export function useAssets() {
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  return useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: async () => {
      await ensureUserContext(supabase, userEmail)

      const { data, error } = await supabase
        .from("assets")
        .select("*, owner:users!assets_owner_id_fkey(id, name, email)")
        .order("created_at", { ascending: false })

      if (error) throw error
      if (!data) return []

      const assetsWithCollaborators = await attachCollaboratorsToAssets(supabase, data)

      return assetsWithCollaborators.map((asset: any) => ({
        ...asset,
        links: sanitizeLinkArray(asset.links),
      })) as Asset[]
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string | null
      links?: string[]
      collaborator_ids?: string[]
      owner_id?: string
      production_url?: string | null
    }) => {
      if (!userEmail) throw new Error("Not authenticated")

      await ensureUserContext(supabase, userEmail)
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", userEmail)
        .single()

      if (!user) throw new Error("User not found")

      const payload = {
        name: data.name,
        description: data.description || null,
        owner_id: data.owner_id || user.id,
        links: prepareLinkPayload(data.links),
        collaborator_ids: Array.isArray(data.collaborator_ids) ? data.collaborator_ids : [],
        production_url: data.production_url || null,
      }

      const { data: asset, error } = await supabase
        .from("assets")
        .insert(payload)
        .select("*, owner:users!assets_owner_id_fkey(id, name, email)")
        .single()

      if (error) throw error
      if (!asset) throw new Error("Failed to create asset")

      const [assetWithCollaborators] = await attachCollaboratorsToAssets(supabase, [asset])
      return {
        asset: {
          ...assetWithCollaborators,
          links: sanitizeLinkArray(assetWithCollaborators.links),
        } as Asset,
      }
    },
    onSuccess: (data) => {
      queryClient.setQueriesData<Asset[]>(
        { queryKey: ["assets"] },
        (old) => (old ? [data.asset, ...old] : [data.asset])
      )
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      name?: string
      description?: string | null
      links?: string[]
      collaborator_ids?: string[]
      owner_id?: string | null
      production_url?: string | null
    }) => {
      if (!userEmail) throw new Error("Not authenticated")

      await ensureUserContext(supabase, userEmail)

      const updatePayload: Record<string, any> = {}
      if (data.name !== undefined) updatePayload.name = data.name
      if (data.description !== undefined) updatePayload.description = data.description
      if (data.links !== undefined) updatePayload.links = prepareLinkPayload(data.links)
      if (data.collaborator_ids !== undefined) {
        updatePayload.collaborator_ids = Array.isArray(data.collaborator_ids)
          ? data.collaborator_ids
          : []
      }
      if (data.owner_id !== undefined) {
        updatePayload.owner_id = data.owner_id
      }
      if (data.production_url !== undefined) {
        updatePayload.production_url = data.production_url
      }

      const { data: asset, error } = await supabase
        .from("assets")
        .update(updatePayload)
        .eq("id", id)
        .select("*, owner:users!assets_owner_id_fkey(id, name, email)")
        .single()

      if (error) throw error
      if (!asset) throw new Error("Asset not found")

      const [assetWithCollaborators] = await attachCollaboratorsToAssets(supabase, [asset])
      return {
        asset: {
          ...assetWithCollaborators,
          links: sanitizeLinkArray(assetWithCollaborators.links),
        } as Asset,
      }
    },
    onSuccess: (data) => {
      queryClient.setQueriesData<Asset[]>(
        { queryKey: ["assets"] },
        (old) => {
          if (!old) return [data.asset]
          return old.map((item) => (item.id === data.asset.id ? data.asset : item))
        }
      )
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!userEmail) throw new Error("Not authenticated")

      await ensureUserContext(supabase, userEmail)

      const { error } = await supabase.from("assets").delete().eq("id", id)
      if (error) throw error
      return { id }
    },
    onSuccess: (data) => {
      queryClient.setQueriesData<Asset[]>(
        { queryKey: ["assets"] },
        (old) => (old ? old.filter((asset) => asset.id !== data.id) : old)
      )
    },
  })
}
