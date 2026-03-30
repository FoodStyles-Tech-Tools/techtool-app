"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { toast } from "@client/components/ui/toast"
import { requestJson } from "@client/lib/api"

export interface Sprint {
  id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export function useSprints() {
  const queryClient = useQueryClient()

  useRealtimeSubscription({
    table: "sprints",
    enabled: true,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
    },
  })

  const { data, isLoading, refetch } = useQuery<Sprint[]>({
    queryKey: ["sprints"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const response = await requestJson<{ sprints: Sprint[] }>("/api/sprints")
      return response.sprints || []
    },
  })

  return {
    sprints: data || [],
    loading: isLoading,
    refresh: refetch,
  }
}

export function useCreateSprint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sprint: {
      name: string
      description?: string
      start_date?: string | null
      end_date?: string | null
      projectId?: string | null
    }) => requestJson<{ sprint: Sprint }>("/api/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sprint),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
      toast("Sprint created successfully")
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to create sprint", "error")
    },
  })
}

export function useUpdateSprint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string
      name?: string
      description?: string
      start_date?: string | null
      end_date?: string | null
    }) => requestJson<{ sprint: Sprint }>(`/api/sprints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
      toast("Sprint updated successfully")
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to update sprint", "error")
    },
  })
}

export function useDeleteSprint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await requestJson<{ success: boolean }>(`/api/sprints/${id}`, {
        method: "DELETE",
      })
      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
      toast("Sprint deleted successfully")
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to delete sprint", "error")
    },
  })
}
