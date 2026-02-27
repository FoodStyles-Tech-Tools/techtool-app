"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { requestJson } from "@/lib/client/api"
import type { User } from "@/lib/types"

type UseUsersOptions = {
  enabled?: boolean
  realtime?: boolean
}

function sortUsersByName(users: User[]): User[] {
  return [...users].sort((left, right) => {
    const leftName = left.name?.trim() || left.email
    const rightName = right.name?.trim() || right.email
    return leftName.localeCompare(rightName, undefined, { sensitivity: "base" })
  })
}

export function useUsers(options?: UseUsersOptions) {
  const queryClient = useQueryClient()
  const enabled = options?.enabled !== false
  const realtime = options?.realtime === true

  useRealtimeSubscription({
    table: "users",
    enabled: enabled && realtime,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
    onUpdate: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      const updatedId = (payload.new as { id?: string } | null)?.id
      if (updatedId) {
        queryClient.invalidateQueries({ queryKey: ["user", updatedId] })
      }
    },
    onDelete: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      const deletedId = (payload.old as { id?: string } | null)?.id
      if (deletedId) {
        queryClient.removeQueries({ queryKey: ["user", deletedId] })
      }
    },
  })

  return useQuery<User[]>({
    queryKey: ["users"],
    enabled,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const response = await requestJson<{ users: User[] }>("/api/users")
      return sortUsersByName(response.users || [])
    },
  })
}

export function useUser(userId: string) {
  const queryClient = useQueryClient()
  const enabled = !!userId

  useRealtimeSubscription({
    table: "users",
    filter: `id=eq.${userId}`,
    enabled,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
    onDelete: () => {
      queryClient.removeQueries({ queryKey: ["user", userId] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  return useQuery<{ user: User }>({
    queryKey: ["user", userId],
    enabled,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => requestJson<{ user: User }>(`/api/users/${userId}`),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      email: string
      name?: string
      discord_id?: string
      role?: string
    }) => requestJson<{ user: User }>("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      name?: string
      discord_id?: string
      role?: string
    }) => requestJson<{ user: User }>(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user", data.user.id] })
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}
