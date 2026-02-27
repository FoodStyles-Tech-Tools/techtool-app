"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { requestJson, createQueryString } from "@/lib/client/api"
import { prepareLinkPayload, sanitizeLinkArray } from "@/lib/links"

interface ProjectCollaborator {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  require_sqa: boolean
  links: string[]
  department: {
    id: string
    name: string
  } | null
  owner: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
  collaborator_ids: string[]
  collaborators: ProjectCollaborator[]
  requester_ids: string[]
  requesters: ProjectCollaborator[]
  created_at: string
}

interface ProjectsResponse {
  projects: Project[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

type UseProjectsOptions = {
  status?: string
  limit?: number
  page?: number
  enabled?: boolean
  realtime?: boolean
}

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

function normalizeProject(project: Project): Project {
  return {
    ...project,
    links: sanitizeLinkArray(project.links),
    collaborator_ids: toArray<string>(project.collaborator_ids),
    collaborators: toArray<ProjectCollaborator>(project.collaborators),
    requester_ids: toArray<string>(project.requester_ids),
    requesters: toArray<ProjectCollaborator>(project.requesters),
  }
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
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      const updatedId = (payload.new as { id?: string } | null)?.id
      if (updatedId) {
        queryClient.invalidateQueries({ queryKey: ["project", updatedId] })
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
      const response = await requestJson<ProjectsResponse>(`/api/projects${query}`)
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
      const response = await requestJson<{ project: Project }>(`/api/projects/${projectId}`)
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

      const response = await requestJson<{ project: Project }>(`/api/projects`, {
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

      const response = await requestJson<{ project: Project }>(`/api/projects/${id}`, {
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

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await requestJson<{ success: boolean }>(`/api/projects/${id}`, {
        method: "DELETE",
      })

      return { id }
    },
    onSuccess: ({ id }) => {
      queryClient.removeQueries({ queryKey: ["project", id] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}
