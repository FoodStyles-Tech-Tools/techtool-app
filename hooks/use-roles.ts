"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { useSupabaseClient } from "@/lib/supabase"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"

export interface Permission {
  id: string
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
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  // Real-time subscription for roles
  useRealtimeSubscription({
    table: "roles",
    enabled: true,
    onInsert: async (payload) => {
      const newRoleData = payload.new as any
      // Fetch full role with permissions
      try {
        await ensureUserContext(supabase, userEmail)
        const { data: role, error } = await supabase
          .from("roles")
          .select(`
            *,
            permissions:permissions(id, resource, action)
          `)
          .eq("id", newRoleData.id)
          .single()

        if (!error && role) {
          queryClient.setQueriesData<Role[]>(
            { queryKey: ["roles"] },
            (old) => {
              if (!old) return old
              if (!old.some(r => r.id === role.id)) {
                return [...old, role]
              }
              return old
            }
          )
        }
      } catch (error) {
        console.error("Error fetching new role:", error)
        queryClient.invalidateQueries({ queryKey: ["roles"] })
      }
    },
    onUpdate: async (payload) => {
      const updatedRoleData = payload.new as any
      // Fetch full role with permissions
      try {
        await ensureUserContext(supabase, userEmail)
        const { data: role, error } = await supabase
          .from("roles")
          .select(`
            *,
            permissions:permissions(id, resource, action)
          `)
          .eq("id", updatedRoleData.id)
          .single()

        if (!error && role) {
          queryClient.setQueriesData<Role[]>(
            { queryKey: ["roles"] },
            (old) => {
              if (!old) return old
              const index = old.findIndex(r => r.id === role.id)
              if (index !== -1) {
                const newRoles = [...old]
                newRoles[index] = role
                return newRoles
              }
              return old
            }
          )
        }
      } catch (error) {
        console.error("Error fetching updated role:", error)
        queryClient.invalidateQueries({ queryKey: ["roles"] })
      }
    },
    onDelete: (payload) => {
      const deletedId = payload.old.id as string
      queryClient.setQueriesData<Role[]>(
        { queryKey: ["roles"] },
        (old) => old ? old.filter(r => r.id !== deletedId) : old
      )
    },
  })

  // Real-time subscription for permissions (to update roles when permissions change)
  useRealtimeSubscription({
    table: "permissions",
    enabled: true,
    onInsert: async (payload) => {
      const newPermission = payload.new as any
      // Invalidate roles to refetch with new permissions
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
    onUpdate: async (payload) => {
      // Invalidate roles to refetch with updated permissions
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
    onDelete: (payload) => {
      // Invalidate roles to refetch without deleted permissions
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
  })

  return useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      // Set user context for RLS (cached, only called once per session)
      await ensureUserContext(supabase, userEmail)

      const { data: roles, error } = await supabase
        .from("roles")
        .select(`
          *,
          permissions:permissions(id, resource, action)
        `)
        .order("name", { ascending: true })

      if (error) throw error
      return roles || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - roles don't change often
  })
}

export function useRole(roleId: string) {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  // Real-time subscription for specific role
  useRealtimeSubscription({
    table: "roles",
    filter: `id=eq.${roleId}`,
    enabled: !!roleId,
    onUpdate: async (payload) => {
      // Fetch full role with permissions
      try {
        await ensureUserContext(supabase, userEmail)
        const { data: role, error } = await supabase
          .from("roles")
          .select(`
            *,
            permissions:permissions(id, resource, action)
          `)
          .eq("id", roleId)
          .single()

        if (!error && role) {
          queryClient.setQueryData<{ role: Role }>(["role", roleId], { role })
          queryClient.setQueriesData<Role[]>(
            { queryKey: ["roles"] },
            (old) => {
              if (!old) return old
              const index = old.findIndex(r => r.id === roleId)
              if (index !== -1) {
                const newRoles = [...old]
                newRoles[index] = role
                return newRoles
              }
              return old
            }
          )
        }
      } catch (error) {
        console.error("Error fetching updated role:", error)
        queryClient.invalidateQueries({ queryKey: ["role", roleId] })
      }
    },
    onDelete: () => {
      queryClient.removeQueries({ queryKey: ["role", roleId] })
      queryClient.setQueriesData<Role[]>(
        { queryKey: ["roles"] },
        (old) => old ? old.filter(r => r.id !== roleId) : old
      )
    },
  })

  return useQuery<{ role: Role }>({
    queryKey: ["role", roleId],
    queryFn: async () => {
      // Set user context for RLS (cached, only called once per session)
      await ensureUserContext(supabase, userEmail)

      const { data: role, error } = await supabase
        .from("roles")
        .select(`
          *,
          permissions:permissions(id, resource, action)
        `)
        .eq("id", roleId)
        .single()

      if (error) throw error
      if (!role) throw new Error("Role not found")
      return { role }
    },
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000,
  })
}

