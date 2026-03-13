"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { requestJson } from "@client/lib/api"

export interface Department {
  id: string
  name: string
}

type UseDepartmentsOptions = {
  enabled?: boolean
  realtime?: boolean
}

export function useDepartments(options?: UseDepartmentsOptions) {
  const queryClient = useQueryClient()
  const enabled = options?.enabled !== false
  const realtime = options?.realtime === true

  useRealtimeSubscription({
    table: "departments",
    enabled: enabled && realtime,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] })
    },
  })

  const { data, isLoading, refetch } = useQuery<Department[]>({
    queryKey: ["departments"],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await requestJson<{ departments: Department[] }>("/api/departments")
      return response.departments || []
    },
  })

  return {
    departments: data || [],
    loading: isLoading,
    refresh: refetch,
  }
}
