"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { useSupabaseClient } from "@/lib/supabase-client"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"
import { toast } from "@/components/ui/toast"

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
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  // Real-time subscription for sprints
  useRealtimeSubscription({
    table: "sprints",
    enabled: !!projectId,
    filter: projectId ? `project_id=eq.${projectId}` : undefined,
    onInsert: (payload) => {
      const newSprint = payload.new as Sprint
      if (newSprint.project_id === projectId) {
        queryClient.setQueryData<Sprint[]>(
          ["sprints", projectId],
          (old) => {
            if (!old) return old
            if (!old.some(s => s.id === newSprint.id)) {
              return [...old, newSprint]
            }
            return old
          }
        )
      }
    },
    onUpdate: (payload) => {
      const updatedSprint = payload.new as Sprint
      if (updatedSprint.project_id === projectId) {
        queryClient.setQueryData<Sprint[]>(
          ["sprints", projectId],
          (old) => {
            if (!old) return old
            const sprintIndex = old.findIndex(s => s.id === updatedSprint.id)
            if (sprintIndex !== -1) {
              const newSprints = [...old]
              newSprints[sprintIndex] = updatedSprint
              return newSprints
            }
            return old
          }
        )
      }
    },
    onDelete: (payload) => {
      const deletedId = (payload.old as { id: string }).id
      queryClient.setQueryData<Sprint[]>(
        ["sprints", projectId],
        (old) => {
          if (!old) return old
          return old.filter(s => s.id !== deletedId)
        }
      )
    },
  })

  const { data, isLoading, refetch } = useQuery<Sprint[]>({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      if (!projectId) return []
      
      await ensureUserContext(supabase, userEmail)
      
      const response = await fetch(`/api/sprints?project_id=${projectId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch sprints")
      }
      const result = await response.json()
      return result.sprints || []
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    }) => {
      const response = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sprint),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create sprint")
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      const sprint = data.sprint as Sprint
      queryClient.setQueryData<Sprint[]>(
        ["sprints", sprint.project_id],
        (old) => {
          if (!old) return [sprint]
          if (!old.some(s => s.id === sprint.id)) {
            return [...old, sprint]
          }
          return old
        }
      )
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
    }) => {
      const response = await fetch(`/api/sprints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update sprint")
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      const sprint = data.sprint as Sprint
      queryClient.setQueryData<Sprint[]>(
        ["sprints", sprint.project_id],
        (old) => {
          if (!old) return old
          const sprintIndex = old.findIndex(s => s.id === sprint.id)
          if (sprintIndex !== -1) {
            const newSprints = [...old]
            newSprints[sprintIndex] = sprint
            return newSprints
          }
          return old
        }
      )
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
      const response = await fetch(`/api/sprints/${id}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete sprint")
      }
      
      return { id }
    },
    onSuccess: () => {
      // Invalidate all sprint queries since we don't know the project_id
      queryClient.invalidateQueries({ queryKey: ["sprints"] })
      toast("Sprint deleted successfully")
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to delete sprint", "error")
    },
  })
}

