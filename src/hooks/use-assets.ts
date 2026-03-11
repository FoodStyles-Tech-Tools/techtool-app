"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { prepareLinkPayload } from "@shared/links"
import { requestJson } from "@client/lib/api"
import type { Asset } from "@shared/types"
import { normalizeAsset } from "@shared/types/asset-mappers"
import type { AssetDto } from "@shared/types/api/assets"

export type { Asset }

export function useAssets() {
  return useQuery<Asset[]>({
    queryKey: ["assets"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const response = await requestJson<{ assets: AssetDto[] }>("/api/assets")
      return (response.assets || []).map(normalizeAsset)
    },
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string | null
      links?: string[]
      collaborator_ids?: string[]
      owner_id?: string
      production_url?: string | null
    }) => {
      const payload = {
        ...data,
        links: prepareLinkPayload(data.links),
        collaborator_ids: Array.isArray(data.collaborator_ids)
          ? data.collaborator_ids.filter(Boolean)
          : [],
      }

      const response = await requestJson<{ asset: AssetDto }>("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      return { asset: normalizeAsset(response.asset) }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] })
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()

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
      const payload = {
        ...data,
        ...(data.links !== undefined ? { links: prepareLinkPayload(data.links) } : {}),
        ...(data.collaborator_ids !== undefined
          ? { collaborator_ids: data.collaborator_ids.filter(Boolean) }
          : {}),
      }

      const response = await requestJson<{ asset: AssetDto }>(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      return { asset: normalizeAsset(response.asset) }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] })
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await requestJson<{ success: boolean }>(`/api/assets/${id}`, {
        method: "DELETE",
      })
      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] })
    },
  })
}
