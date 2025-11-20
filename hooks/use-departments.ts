"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { useSupabaseClient } from "@/lib/supabase-client"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"

export interface Department {
  id: string
  name: string
}

export function useDepartments() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  // Real-time subscription for departments
  useRealtimeSubscription({
    table: "departments",
    enabled: true,
    onInsert: (payload) => {
      const newDepartment = payload.new as Department
      // Update departments query
      queryClient.setQueryData<Department[]>(
        ["departments"],
        (old) => {
          if (!old) return old
          if (!old.some(d => d.id === newDepartment.id)) {
            return [...old, newDepartment]
          }
          return old
        }
      )
    },
    onUpdate: (payload) => {
      const updatedDepartment = payload.new as Department
      // Update department in query cache
      queryClient.setQueryData<Department[]>(
        ["departments"],
        (old) => {
          if (!old) return old
          const departmentIndex = old.findIndex(d => d.id === updatedDepartment.id)
          if (departmentIndex !== -1) {
            const newDepartments = [...old]
            newDepartments[departmentIndex] = updatedDepartment
            return newDepartments
          }
          return old
        }
      )
    },
    onDelete: (payload) => {
      const deletedId = (payload.old as { id: string }).id
      // Remove department from query cache
      queryClient.setQueryData<Department[]>(
        ["departments"],
        (old) => {
          if (!old) return old
          return old.filter(d => d.id !== deletedId)
        }
      )
    },
  })

  const { data, isLoading, refetch } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      // Set user context for RLS (cached, only called once per session)
      await ensureUserContext(supabase, userEmail)
      
      const { data: departments, error } = await supabase
        .from("departments")
        .select("*")
        .order("name", { ascending: true })

      if (error) throw error
      return departments || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - departments don't change often
  })

  return {
    departments: data || [],
    loading: isLoading,
    refresh: refetch,
  }
}

