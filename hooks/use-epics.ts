"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { useSupabaseClient } from "@/lib/supabase-client"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"
import { toast } from "@/components/ui/toast"

export interface Epic {
  id: string
  name: string
  description: string | null
  project_id: string
  color: string
  created_at: string
  updated_at: string
}

export function useEpics(projectId: string | null) {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  // Real-time subscription for epics
  useRealtimeSubscription({
    table: "epics",
    enabled: !!projectId,
    filter: projectId ? `project_id=eq.${projectId}` : undefined,
    onInsert: (payload) => {
      const newEpic = payload.new as Epic
      if (newEpic.project_id === projectId) {
        queryClient.setQueryData<Epic[]>(
          ["epics", projectId],
          (old) => {
            if (!old) return old
            if (!old.some(e => e.id === newEpic.id)) {
              return [...old, newEpic]
            }
            return old
          }
        )
      }
    },
    onUpdate: (payload) => {
      const updatedEpic = payload.new as Epic
      if (updatedEpic.project_id === projectId) {
        queryClient.setQueryData<Epic[]>(
          ["epics", projectId],
          (old) => {
            if (!old) return old
            const epicIndex = old.findIndex(e => e.id === updatedEpic.id)
            if (epicIndex !== -1) {
              const newEpics = [...old]
              newEpics[epicIndex] = updatedEpic
              return newEpics
            }
            return old
          }
        )
      }
    },
    onDelete: (payload) => {
      const deletedId = (payload.old as { id: string }).id
      queryClient.setQueryData<Epic[]>(
        ["epics", projectId],
        (old) => {
          if (!old) return old
          return old.filter(e => e.id !== deletedId)
        }
      )
    },
  })

  const { data, isLoading, refetch } = useQuery<Epic[]>({
    queryKey: ["epics", projectId],
    queryFn: async () => {
      if (!projectId) return []
      
      await ensureUserContext(supabase, userEmail)
      
      const response = await fetch(`/api/epics?project_id=${projectId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch epics")
      }
      const result = await response.json()
      return result.epics || []
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    mutationFn: async (epic: { name: string; description?: string; project_id: string; color?: string; sprint_id?: string | null }) => {
      const response = await fetch("/api/epics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(epic),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create epic")
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      const epic = data.epic as Epic
      queryClient.setQueryData<Epic[]>(
        ["epics", epic.project_id],
        (old) => {
          if (!old) return [epic]
          if (!old.some(e => e.id === epic.id)) {
            return [...old, epic]
          }
          return old
        }
      )
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
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; color?: string; sprint_id?: string | null }) => {
      const response = await fetch(`/api/epics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update epic")
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      const epic = data.epic as Epic
      queryClient.setQueryData<Epic[]>(
        ["epics", epic.project_id],
        (old) => {
          if (!old) return old
          const epicIndex = old.findIndex(e => e.id === epic.id)
          if (epicIndex !== -1) {
            const newEpics = [...old]
            newEpics[epicIndex] = epic
            return newEpics
          }
          return old
        }
      )
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
      const response = await fetch(`/api/epics/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete epic")
      }
      
      return { id }
    },
    onSuccess: (data, epicId) => {
      // Invalidate all epic queries since we don't know the project_id
      queryClient.invalidateQueries({ queryKey: ["epics"] })
      toast("Epic deleted successfully")
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to delete epic", "error")
    },
  })
}

