"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { toast } from "@client/components/ui/toast"
import { createQueryString, requestJson } from "@client/lib/api"

export interface Epic {
  id: string
  name: string
  description: string | null
  project_id: string
  color: string
  sprint_id: string | null
  created_at: string
  updated_at: string
}

export function useEpics(projectId: string | null) {
  const queryClient = useQueryClient()
  const enabled = !!projectId

  useRealtimeSubscription({
    table: "epics",
    filter: projectId ? `project_id=eq.${projectId}` : undefined,
    enabled,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["epics", projectId] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["epics", projectId] })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["epics", projectId] })
    },
  })

  const { data, isLoading, refetch } = useQuery<Epic[]>({
    queryKey: ["epics", projectId],
    enabled,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!projectId) return []
      const query = createQueryString({ project_id: projectId })
      const response = await requestJson<{ epics: Epic[] }>(`/api/epics${query}`)
      return response.epics || []
    },
  })

  return {
    epics: data || [],
    loading: isLoading,
    refresh: refetch,
  }
}

export function useCreateEpic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (epic: {
      name: string
      description?: string
      project_id: string
      color?: string
      sprint_id?: string | null
    }) => requestJson<{ epic: Epic }>("/api/epics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(epic),
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["epics", data.epic.project_id] })
      toast("Epic created successfully")
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to create epic", "error")
    },
  })
}

export function useUpdateEpic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string
      name?: string
      description?: string
      color?: string
      sprint_id?: string | null
    }) => requestJson<{ epic: Epic }>(`/api/epics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["epics", data.epic.project_id] })
      toast("Epic updated successfully")
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to update epic", "error")
    },
  })
}

export function useDeleteEpic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await requestJson<{ success: boolean }>(`/api/epics/${id}`, { method: "DELETE" })
      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epics"] })
      toast("Epic deleted successfully")
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to delete epic", "error")
    },
  })
}
