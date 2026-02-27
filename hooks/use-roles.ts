"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { requestJson } from "@/lib/client/api"

export interface Permission {
  id?: string
  resource: string
  action: string
}

export interface Role {
  id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
  updated_at: string
  permissions: Permission[]
}

export function useRoles() {
  const queryClient = useQueryClient()

  useRealtimeSubscription({
    table: "roles",
    enabled: true,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
    onUpdate: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      const updatedId = (payload.new as { id?: string } | null)?.id
      if (updatedId) {
        queryClient.invalidateQueries({ queryKey: ["role", updatedId] })
      }
    },
    onDelete: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      const deletedId = (payload.old as { id?: string } | null)?.id
      if (deletedId) {
        queryClient.removeQueries({ queryKey: ["role", deletedId] })
      }
    },
  })

  useRealtimeSubscription({
    table: "permissions",
    enabled: true,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
  })

  return useQuery<Role[]>({
    queryKey: ["roles"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await requestJson<{ roles: Role[] }>("/api/roles")
      return response.roles || []
    },
  })
}

export function useRole(roleId: string) {
  const queryClient = useQueryClient()
  const enabled = !!roleId

  useRealtimeSubscription({
    table: "roles",
    filter: `id=eq.${roleId}`,
    enabled,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["role", roleId] })
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["role", roleId] })
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
    onDelete: () => {
      queryClient.removeQueries({ queryKey: ["role", roleId] })
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
  })

  return useQuery<{ role: Role }>({
    queryKey: ["role", roleId],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => requestJson<{ role: Role }>(`/api/roles/${roleId}`),
  })
}
