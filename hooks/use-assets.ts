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

export interface Asset {
  id: string
  name: string
  description: string | null
  links: string[]
  owner: AssetOwner | null
  owner_id: string
  created_at: string
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

      return data.map((asset: any) => ({
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
    mutationFn: async (data: { name: string; description?: string | null; links?: string[] }) => {
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
        owner_id: user.id,
        links: prepareLinkPayload(data.links),
      }

      const { data: asset, error } = await supabase
        .from("assets")
        .insert(payload)
        .select("*, owner:users!assets_owner_id_fkey(id, name, email)")
        .single()

      if (error) throw error
      if (!asset) throw new Error("Failed to create asset")

      return {
        asset: {
          ...asset,
          links: sanitizeLinkArray(asset.links),
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
    }) => {
      if (!userEmail) throw new Error("Not authenticated")

      await ensureUserContext(supabase, userEmail)

      const updatePayload: Record<string, any> = {}
      if (data.name !== undefined) updatePayload.name = data.name
      if (data.description !== undefined) updatePayload.description = data.description
      if (data.links !== undefined) updatePayload.links = prepareLinkPayload(data.links)

      const { data: asset, error } = await supabase
        .from("assets")
        .update(updatePayload)
        .eq("id", id)
        .select("*, owner:users!assets_owner_id_fkey(id, name, email)")
        .single()

      if (error) throw error
      if (!asset) throw new Error("Asset not found")

      return {
        asset: {
          ...asset,
          links: sanitizeLinkArray(asset.links),
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
