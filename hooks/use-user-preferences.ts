"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface UserPreferences {
  user_id: string
  group_by_epic: boolean
  tickets_view: "table" | "kanban"
  pinned_project_ids: string[]
}

export function useUserPreferences() {
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery<{ preferences: UserPreferences }>({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const response = await fetch("/api/user-preferences")
      if (!response.ok) {
        throw new Error("Failed to fetch user preferences")
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const updatePreferences = useMutation({
    mutationFn: async (
      updates: Partial<Pick<UserPreferences, "group_by_epic" | "tickets_view" | "pinned_project_ids">>
    ) => {
      const response = await fetch("/api/user-preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        throw new Error("Failed to update user preferences")
      }
      return response.json()
    },
    onSuccess: (data) => {
      // Update the query cache with the new preferences
      queryClient.setQueryData(["user-preferences"], data)
    },
  })

  return {
    preferences: data?.preferences || {
      user_id: "",
      group_by_epic: false,
      tickets_view: "table" as const,
      pinned_project_ids: [],
    },
    loading: isLoading,
    updatePreferences: updatePreferences.mutateAsync,
    isUpdating: updatePreferences.isPending,
    refresh: refetch,
  }
}
