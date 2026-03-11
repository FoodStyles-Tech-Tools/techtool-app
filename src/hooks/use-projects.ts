"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { requestJson, createQueryString } from "@client/lib/api"
import { prepareLinkPayload } from "@shared/links"
import type { Project, ProjectTicketStats } from "@shared/types"
import { normalizeProject } from "@shared/types/project-mappers"
import type { ProjectDto, ProjectsResponseDto } from "@shared/types/api/projects"

type UseProjectsOptions = {
  status?: string
  limit?: number
  page?: number
  enabled?: boolean
  realtime?: boolean
}

export function useProjects(options?: UseProjectsOptions) {
  const queryClient = useQueryClient()
  const enabled = options?.enabled !== false
  const realtime = options?.realtime === true
  const queryKey = ["projects", options?.status, options?.limit, options?.page] as const

  useRealtimeSubscription({
    table: "projects",
    enabled: enabled && realtime,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
    onUpdate: (payload) => {
      const updatedId = (payload.new as { id?: string } | null)?.id
      if (updatedId) {
        const partial = payload.new as Partial<Project>
        queryClient.setQueriesData<Project[]>({ queryKey: ["projects"] }, (current) => {
          if (!Array.isArray(current) || current.length === 0) return current
          let changed = false
          const next = current.map((project) => {
            if (project.id !== updatedId) return project
            changed = true
            return normalizeProject({
              ...project,
              ...partial,
            } as Project)
          })
          return changed ? next : current
        })
        queryClient.setQueryData<{ project: Project }>(["project", updatedId], (current) => {
          if (!current?.project) return current
          return {
            project: normalizeProject({
              ...current.project,
              ...partial,
            } as Project),
          }
        })
      }
    },
    onDelete: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      const deletedId = (payload.old as { id?: string } | null)?.id
      if (deletedId) {
        queryClient.removeQueries({ queryKey: ["project", deletedId] })
      }
    },
  })

  return useQuery<Project[]>({
    queryKey,
    enabled,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const query = createQueryString({
        status: options?.status,
        limit: options?.limit,
        page: options?.page,
      })
      const response = await requestJson<ProjectsResponseDto>(`/api/projects${query}`)
      return (response.projects || []).map(normalizeProject)
    },
  })
}

export function useProject(projectId: string, options?: { enabled?: boolean; realtime?: boolean }) {
  const queryClient = useQueryClient()
  const enabled = !!projectId && options?.enabled !== false
  const realtime = options?.realtime !== false

  useRealtimeSubscription({
    table: "projects",
    filter: `id=eq.${projectId}`,
    enabled: enabled && realtime,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
    onDelete: () => {
      queryClient.removeQueries({ queryKey: ["project", projectId] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })

  return useQuery<{ project: Project }>({
    queryKey: ["project", projectId],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const response = await requestJson<{ project: ProjectDto }>(`/api/projects/${projectId}`)
      return { project: normalizeProject(response.project) }
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      status?: string
      department_id?: string
      require_sqa?: boolean
      links?: string[]
      collaborator_ids?: string[]
      requester_ids?: string[]
    }) => {
      const payload = {
        ...data,
        links: prepareLinkPayload(data.links),
        collaborator_ids: toArray<string>(data.collaborator_ids),
        requester_ids: toArray<string>(data.requester_ids),
      }

      const response = await requestJson<{ project: ProjectDto }>(`/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      return { project: normalizeProject(response.project) }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      name?: string
      description?: string
      status?: string
      department_id?: string | null
      require_sqa?: boolean
      owner_id?: string | null
      links?: string[]
      collaborator_ids?: string[]
      requester_ids?: string[]
    }) => {
      const payload = {
        ...data,
        ...(data.links !== undefined ? { links: prepareLinkPayload(data.links) } : {}),
        ...(data.collaborator_ids !== undefined ? { collaborator_ids: toArray<string>(data.collaborator_ids) } : {}),
        ...(data.requester_ids !== undefined ? { requester_ids: toArray<string>(data.requester_ids) } : {}),
      }

      const response = await requestJson<{ project: ProjectDto }>(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      return { project: normalizeProject(response.project) }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<{ project: Project }>(["project", data.project.id], data)
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}
