"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { toast } from "@/components/ui/toast"
import { createQueryString, requestJson } from "@/lib/client/api"

export interface Sprint {
  id: string
  name: string
  description: string | null
  project_id: string
  status: "planned" | "active" | "completed" | "cancelled"
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export function useSprints(projectId: string | null) {
  const queryClient = useQueryClient()
  const enabled = !!projectId

  useRealtimeSubscription({
    table: "sprints",
    filter: projectId ? `project_id=eq.${projectId}` : undefined,
    enabled,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", projectId] })
    },
  })

  const { data, isLoading, refetch } = useQuery<Sprint[]>({
    queryKey: ["sprints", projectId],
    enabled,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!projectId) return []
      const query = createQueryString({ project_id: projectId })
      const response = await requestJson<{ sprints: Sprint[] }>(`/api/sprints${query}`)
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
      project_id: string
      status?: "planned" | "active" | "completed" | "cancelled"
      start_date?: string | null
      end_date?: string | null
    }) => requestJson<{ sprint: Sprint }>("/api/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sprint),
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sprints", data.sprint.project_id] })
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
      status?: "planned" | "active" | "completed" | "cancelled"
      start_date?: string | null
      end_date?: string | null
    }) => requestJson<{ sprint: Sprint }>(`/api/sprints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sprints", data.sprint.project_id] })
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
