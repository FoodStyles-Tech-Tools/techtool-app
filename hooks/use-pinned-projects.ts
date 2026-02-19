"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSupabaseClient } from "@/lib/supabase-client"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"
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
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  const { preferences, loading: preferencesLoading } = useUserPreferences()
  const pinnedProjectIds = useMemo(
    () =>
      Array.isArray(preferences.pinned_project_ids)
        ? preferences.pinned_project_ids.filter(Boolean)
        : [],
    [preferences.pinned_project_ids]
  )
  const enabled =
    options?.enabled !== false && Boolean(userEmail) && !preferencesLoading && pinnedProjectIds.length > 0

  const query = useQuery<PinnedProject[]>({
    queryKey: ["pinned-projects", ...pinnedProjectIds],
    queryFn: async () => {
      await ensureUserContext(supabase, userEmail)

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status")
        .in("id", pinnedProjectIds)

      if (error) throw error

      const projectMap = new Map<string, PinnedProject>()
      ;(data || []).forEach((project: any) => {
        projectMap.set(project.id, project as PinnedProject)
      })

      return pinnedProjectIds
        .map((projectId) => projectMap.get(projectId))
        .filter((project): project is PinnedProject => Boolean(project))
    },
    enabled,
    staleTime: 60 * 1000,
  })

  return {
    pinnedProjectIds,
    pinnedProjects: query.data || [],
    loading: preferencesLoading || query.isLoading,
  }
}
