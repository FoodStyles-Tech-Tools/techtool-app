"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
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
