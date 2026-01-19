"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import { useSupabaseClient } from "@/lib/supabase-client"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"
import { useRealtimeSubscription } from "./use-realtime"

interface Permission {
  resource: string
  action: string
}

interface User {
  id: string
  email: string
  name: string | null
  role: string
  image: string | null
  permissions?: Permission[]
}

export function usePermissions() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  // Real-time subscription for roles and permissions changes
  useRealtimeSubscription({
    table: "roles",
    enabled: true,
    onUpdate: () => {
      // Refresh permissions when roles change
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] })
    },
  })

  useRealtimeSubscription({
    table: "permissions",
    enabled: true,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] })
    },
  })

  useRealtimeSubscription({
    table: "users",
    enabled: true,
    onUpdate: (payload) => {
      // Refresh if current user's role changed
      const updatedUser = payload.new as any
      if (updatedUser.email === userEmail) {
        queryClient.invalidateQueries({ queryKey: ["user-permissions"] })
      }
    },
  })

  const { data, isLoading, refetch } = useQuery<{ user: User }>({
    queryKey: ["user-permissions"],
    queryFn: async () => {
      if (!userEmail) throw new Error("Not authenticated")

      // Set user context for RLS (cached, only called once per session)
      await ensureUserContext(supabase, userEmail)

      // Get user from users table
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", userEmail)
        .single()

      if (userError || !user) throw new Error("User not found")

      // Get image from auth_user
      const { data: authUser } = await supabase
        .from("auth_user")
        .select("image")
        .eq("email", user.email)
        .single()

      // Get permissions based on role
      let permissions: Permission[] = []

      // Admin role has all permissions (case-insensitive check)
      if (user.role?.toLowerCase() === "admin") {
        const allResources = ["projects", "tickets", "users", "roles", "settings", "assets"]
        const allActions = ["view", "create", "edit", "delete", "manage"]
        permissions = allResources.flatMap((resource) =>
          allActions.map((action) => ({ resource, action }))
        )
      } else {
        // Get permissions from database using case-insensitive matching
        const { data: roleData } = await supabase
          .from("roles")
          .select("id")
          .ilike("name", user.role || "")
          .single()

        if (roleData) {
          const { data: permData } = await supabase
            .from("permissions")
            .select("resource, action")
            .eq("role_id", roleData.id)

          if (permData) {
            permissions = permData.map((p) => ({
              resource: p.resource,
              action: p.action,
            }))
          }
        }
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: authUser?.image || null,
          role: user.role,
          permissions,
        },
      }
    },
    enabled: !!userEmail,
    staleTime: 5 * 60 * 1000, // 5 minutes - permissions don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  })

  const user = data?.user || null

  const hasPermission = useMemo(
    () => (
      resource: "projects" | "tickets" | "users" | "roles" | "settings" | "assets",
      action: "view" | "create" | "edit" | "delete" | "manage"
    ): boolean => {
      if (!user) return false

      // Admin role always has all permissions (case-insensitive check)
      if (user.role?.toLowerCase() === "admin") {
        return true
      }

      // Check if user has the specific permission
      return user.permissions?.some(
        (p) => p.resource === resource && p.action === action
      ) || false
    },
    [user]
  )

  return {
    user,
    loading: isLoading,
    hasPermission,
    refetch,
  }
}

