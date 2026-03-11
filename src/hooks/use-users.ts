"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { requestJson } from "@client/lib/api"
import type { User } from "@shared/types"
import type { UserDto } from "@shared/types/api/users"

type UseUsersOptions = {
  enabled?: boolean
  realtime?: boolean
}

function mapUserDtoToDomain(dto: UserDto): User {
  return dto
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
      const updatedId = (payload.new as { id?: string } | null)?.id
      if (updatedId) {
        const partial = payload.new as Partial<User>
        queryClient.setQueriesData<User[]>({ queryKey: ["users"] }, (current) => {
          if (!Array.isArray(current) || current.length === 0) return current
          let changed = false
          const next = current.map((user) => {
            if (user.id !== updatedId) return user
            changed = true
            return {
              ...user,
              ...partial,
            } as User
          })
          return changed ? sortUsersByName(next) : current
        })
        queryClient.setQueryData<User>(["user", updatedId], (current) => {
          if (!current) return current
          return {
            ...current,
            ...partial,
          }
        })
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
      const response = await requestJson<{ users: UserDto[] }>("/api/users")
      const users = (response.users || []).map(mapUserDtoToDomain)
      return sortUsersByName(users)
    },
  })
}
