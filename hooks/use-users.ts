"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { useSupabaseClient } from "@/lib/supabase-client"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  role?: string | null
  created_at?: string
}

type UseUsersOptions = {
  enabled?: boolean
  realtime?: boolean
}

export function useUsers(options?: UseUsersOptions) {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  const enabled = options?.enabled !== false
  const realtime = options?.realtime === true

  // Real-time subscription for users
  useRealtimeSubscription({
    table: "users",
    enabled: enabled && realtime,
    onInsert: async (payload) => {
      const newUser = payload.new as User
      // Update users query directly from payload
      queryClient.setQueryData<User[]>(
        ["users"],
        (old) => {
          if (!old) return old
          if (!old.some(u => u.id === newUser.id)) {
            return [...old, newUser]
          }
          return old
        }
      )
    },
    onUpdate: async (payload) => {
      const updatedUser = payload.new as User
      // Update user in query cache directly from payload
      queryClient.setQueryData<User[]>(
        ["users"],
        (old) => {
          if (!old) return old
          const userIndex = old.findIndex(u => u.id === updatedUser.id)
          if (userIndex !== -1) {
            const newUsers = [...old]
            newUsers[userIndex] = updatedUser
            return newUsers
          }
          return old
        }
      )
      // Also update single user query
      queryClient.setQueryData<{ user: User }>(["user", updatedUser.id], { user: updatedUser })
    },
    onDelete: (payload) => {
      const deletedId = (payload.old as { id: string }).id
      // Remove user from query cache
      queryClient.setQueryData<User[]>(
        ["users"],
        (old) => {
          if (!old) return old
          return old.filter(u => u.id !== deletedId)
        }
      )
      // Remove single user query
      queryClient.removeQueries({ queryKey: ["user", deletedId] })
    },
  })

  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      // Set user context for RLS (cached, only called once per session)
      await ensureUserContext(supabase, userEmail)

      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .order("name", { ascending: true, nullsFirst: false })

      if (error) throw error
      if (!users || users.length === 0) return []
      
      // Get images from auth_user for all users
      const emails = users.map(u => u.email)
      const { data: authUsers } = await supabase
        .from("auth_user")
        .select("email, image")
        .in("email", emails)
      
      // Create a map of email -> image
      const imageMap = new Map<string, string | null>()
      authUsers?.forEach(au => {
        imageMap.set(au.email, au.image || null)
      })
      
      // Map users to include image from auth_user
      const usersWithImage = users.map((user) => ({
        ...user,
        image: imageMap.get(user.email) || null,
      }))
      
      return usersWithImage
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - users don't change often
  })
}

export function useUser(userId: string) {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  // Real-time subscription for specific user
  useRealtimeSubscription({
    table: "users",
    filter: `id=eq.${userId}`,
    enabled: !!userId,
    onUpdate: async (payload) => {
      const updatedUser = payload.new as User
      // Update single user cache directly from payload
      queryClient.setQueryData<{ user: User }>(["user", userId], { user: updatedUser })
      // Also update in users list
      queryClient.setQueriesData<User[]>(
        { queryKey: ["users"] },
        (old) => {
          if (!old) return old
          const index = old.findIndex(u => u.id === userId)
          if (index !== -1) {
            const newUsers = [...old]
            newUsers[index] = updatedUser
            return newUsers
          }
          return old
        }
      )
    },
    onDelete: () => {
      // Remove user from cache
      queryClient.removeQueries({ queryKey: ["user", userId] })
      queryClient.setQueriesData<User[]>(
        { queryKey: ["users"] },
        (old) => old ? old.filter(u => u.id !== userId) : old
      )
    },
  })

  return useQuery<{ user: User }>({
    queryKey: ["user", userId],
    queryFn: async () => {
      // Set user context for RLS (cached, only called once per session)
      await ensureUserContext(supabase, userEmail)

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single()

      if (error) throw error
      if (!user) throw new Error("User not found")
      
      // Get image from auth_user
      const { data: authUser } = await supabase
        .from("auth_user")
        .select("image")
        .eq("email", user.email)
        .single()
      
      // Map user to include image from auth_user
      const userWithImage = {
        ...user,
        image: authUser?.image || null,
      }
      
      return { user: userWithImage }
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  
  return useMutation({
    mutationFn: async (data: {
      email: string
      name?: string
      role?: string
    }) => {
      if (!userEmail) throw new Error("Not authenticated")
      
      await ensureUserContext(supabase, userEmail)

      const { data: user, error } = await supabase
        .from("users")
        .insert(data)
        .select("*")
        .single()

      if (error) throw error
      if (!user) throw new Error("Failed to create user")
      
      // Get image from auth_user
      const { data: authUser } = await supabase
        .from("auth_user")
        .select("image")
        .eq("email", user.email)
        .single()
      
      // Map user to include image from auth_user
      const userWithImage = {
        ...user,
        image: authUser?.image || null,
      }
      
      return { user: userWithImage }
    },
    onSuccess: (data) => {
      // Optimistically update cache
      queryClient.setQueriesData<User[]>(
        { queryKey: ["users"] },
        (old) => old ? [...old, data.user] : [data.user]
      )
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      name?: string
      role?: string
    }) => {
      if (!userEmail) throw new Error("Not authenticated")
      
      await ensureUserContext(supabase, userEmail)

      const { data: user, error } = await supabase
        .from("users")
        .update(data)
        .eq("id", id)
        .select("*")
        .single()

      if (error) throw error
      if (!user) throw new Error("User not found")
      
      // Get image from auth_user
      const { data: authUser } = await supabase
        .from("auth_user")
        .select("image")
        .eq("email", user.email)
        .single()
      
      // Map user to include image from auth_user
      const userWithImage = {
        ...user,
        image: authUser?.image || null,
      }
      
      return { user: userWithImage }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["user", variables.id] })
      await queryClient.cancelQueries({ queryKey: ["users"] })

      const previousUser = queryClient.getQueryData<{ user: User }>(["user", variables.id])
      const previousUsers = queryClient.getQueriesData<User[]>({ queryKey: ["users"] })

      // Optimistically update
      if (previousUser) {
        const updatedUser = { ...previousUser.user, ...variables }
        queryClient.setQueryData<{ user: User }>(["user", variables.id], { user: updatedUser })
      }

      previousUsers.forEach(([queryKey, data]) => {
        if (data) {
          const updated = data.map(u => u.id === variables.id ? { ...u, ...variables } : u)
          queryClient.setQueryData<User[]>(queryKey, updated)
        }
      })

      return { previousUser, previousUsers }
    },
    onError: (err, variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(["user", variables.id], context.previousUser)
      }
      if (context?.previousUsers) {
        context.previousUsers.forEach(([queryKey, data]) => {
          if (data) queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: (data) => {
      // Update cache with server response
      queryClient.setQueryData<{ user: User }>(["user", data.user.id], { user: data.user })
      queryClient.setQueriesData<User[]>(
        { queryKey: ["users"] },
        (old) => {
          if (!old) return old
          const index = old.findIndex(u => u.id === data.user.id)
          if (index !== -1) {
            const newUsers = [...old]
            newUsers[index] = data.user
            return newUsers
          }
          return old
        }
      )
    },
  })
}
