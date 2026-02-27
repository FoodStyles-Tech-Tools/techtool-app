"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { createQueryString, requestJson } from "@/lib/client/api"
import { useUserPreferences } from "@/hooks/use-user-preferences"

export type PinnedProject = {
  id: string
  name: string
  status: string
}

type UsePinnedProjectsOptions = {
  enabled?: boolean
}

export function usePinnedProjects(options?: UsePinnedProjectsOptions) {
  const { preferences, loading: preferencesLoading } = useUserPreferences()
  const pinnedProjectIds = useMemo(
    () =>
      Array.isArray(preferences.pinned_project_ids)
        ? preferences.pinned_project_ids.filter(Boolean)
        : [],
    [preferences.pinned_project_ids]
  )
  const enabled =
    options?.enabled !== false && !preferencesLoading && pinnedProjectIds.length > 0

  const query = useQuery<PinnedProject[]>({
    queryKey: ["pinned-projects", ...pinnedProjectIds],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const query = createQueryString({ ids: pinnedProjectIds.join(",") })
      const response = await requestJson<{ projects: PinnedProject[] }>(
        `/api/projects/pinned${query}`
      )
      return response.projects || []
    },
  })

  return {
    pinnedProjectIds,
    pinnedProjects: query.data || [],
    loading: preferencesLoading || query.isLoading,
  }
}
