"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { useSupabaseClient } from "@/lib/supabase-client"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"
import { prepareLinkPayload, sanitizeLinkArray } from "@/lib/links"

async function attachCollaboratorsToProjects(
  supabase: ReturnType<typeof useSupabaseClient>,
  projects: any[]
): Promise<any[]> {
  if (!projects?.length) {
    return projects
  }

  const collaboratorIds = new Set<string>()
  projects.forEach((project) => {
    const ids: string[] = project.collaborator_ids || []
    ids.forEach((id) => {
      if (id) collaboratorIds.add(id)
    })
  })

  if (collaboratorIds.size === 0) {
    return projects.map((project) => ({
      ...project,
      collaborator_ids: project.collaborator_ids || [],
      collaborators: [],
    }))
  }

  const { data: collaboratorUsers, error } = await supabase
    .from("users")
    .select("id, name, email")
    .in("id", Array.from(collaboratorIds))

  if (error) {
    console.error("Error fetching collaborators:", error)
  }

  const collaboratorMap = new Map<string, any>()
  collaboratorUsers?.forEach((user) => collaboratorMap.set(user.id, user))

  return projects.map((project) => {
    const ids: string[] = project.collaborator_ids || []
    const collaborators = ids
      .map((id) => collaboratorMap.get(id))
      .filter(Boolean)

    return {
      ...project,
      collaborator_ids: ids,
      collaborators,
    }
  })
}

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

// Helper function to enrich projects with images from auth_user
async function enrichProjectsWithImages(
  supabase: ReturnType<typeof useSupabaseClient>,
  projects: any[]
): Promise<Project[]> {
  if (!projects || projects.length === 0) return projects as Project[]
  
  // Collect all unique emails from owners
  const emails = new Set<string>()
  projects.forEach(project => {
    if (project.owner?.email) emails.add(project.owner.email)
    project.collaborators?.forEach((collab: any) => {
      if (collab?.email) emails.add(collab.email)
    })
  })
  
  if (emails.size === 0) return projects as Project[]
  
  // Fetch images from auth_user
  const { data: authUsers } = await supabase
    .from("auth_user")
    .select("email, image")
    .in("email", Array.from(emails))
  
  // Create a map of email -> image
  const imageMap = new Map<string, string | null>()
  authUsers?.forEach(au => {
    imageMap.set(au.email, au.image || null)
  })
  
  // Enrich projects with images
  return projects.map(project => ({
    ...project,
    links: sanitizeLinkArray(project.links),
     collaborator_ids: Array.isArray(project.collaborator_ids) ? project.collaborator_ids : [],
    owner: project.owner ? {
      ...project.owner,
      image: imageMap.get(project.owner.email) || null,
    } : project.owner,
    collaborators: (project.collaborators || []).map((collab: any) => ({
      ...collab,
      image: collab?.email ? imageMap.get(collab.email) || null : null,
    })),
  })) as Project[]
}

export function useProjects(options?: UseProjectsOptions) {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  const enabled = options?.enabled !== false
  const realtime = options?.realtime === true
  const queryKey = ["projects", options?.status, options?.limit, options?.page]

  // Real-time subscription for projects
  useRealtimeSubscription({
    table: "projects",
    enabled: enabled && realtime,
    onInsert: async (payload) => {
      const newProjectData = payload.new as any
      // Fetch full project with relations using Supabase
      try {
        await ensureUserContext(supabase, userEmail)
        const { data: project, error } = await supabase
          .from("projects")
          .select(`
            *,
            department:departments(id, name),
            owner:users!projects_owner_id_fkey(id, name, email)
          `)
          .eq("id", newProjectData.id)
          .single()

        if (!error && project) {
          const [projectWithCollaborators] = await attachCollaboratorsToProjects(supabase, [project])
          // Enrich with images
          const enrichedProjects = await enrichProjectsWithImages(supabase, [projectWithCollaborators])
          const enrichedProject = enrichedProjects[0]
          
          // Update all projects queries
          queryClient.setQueriesData<Project[]>(
            { queryKey: ["projects"] },
            (old) => {
              if (!old) return old
              // Check if project matches current filters
              const matchesFilter = !options?.status || enrichedProject.status === options.status
              
              if (matchesFilter && !old.some(p => p.id === enrichedProject.id)) {
                return [...old, enrichedProject]
              }
              return old
            }
          )
        }
      } catch (error) {
        console.error("Error fetching new project:", error)
        // Fallback to invalidation
        queryClient.invalidateQueries({ queryKey: ["projects"] })
      }
    },
    onUpdate: async (payload) => {
      const updatedProjectData = payload.new as any
      // Fetch full project with relations
      try {
        await ensureUserContext(supabase, userEmail)
        const { data: project, error } = await supabase
          .from("projects")
          .select(`
            *,
            department:departments(id, name),
            owner:users!projects_owner_id_fkey(id, name, email)
          `)
          .eq("id", updatedProjectData.id)
          .single()

        if (!error && project) {
          const [projectWithCollaborators] = await attachCollaboratorsToProjects(supabase, [project])
          // Enrich with images
          const enrichedProjects = await enrichProjectsWithImages(supabase, [projectWithCollaborators])
          const enrichedProject = enrichedProjects[0]
          
          // Update project in all query caches
          queryClient.setQueriesData<Project[]>(
            { queryKey: ["projects"] },
            (old) => {
              if (!old) return old
              const projectIndex = old.findIndex(p => p.id === enrichedProject.id)
              if (projectIndex !== -1) {
                const newProjects = [...old]
                newProjects[projectIndex] = enrichedProject
                return newProjects
              }
              return old
            }
          )
          // Also update single project query
          queryClient.setQueryData<{ project: Project }>(["project", updatedProjectData.id], { project: enrichedProject })
        }
      } catch (error) {
        console.error("Error fetching updated project:", error)
        // Fallback: invalidate queries
        queryClient.invalidateQueries({ queryKey: ["projects"] })
      }
    },
    onDelete: (payload) => {
      const deletedId = (payload.old as { id: string }).id
      // Remove project from all query caches
      queryClient.setQueriesData<Project[]>(
        { queryKey: ["projects"] },
        (old) => {
          if (!old) return old
          return old.filter(p => p.id !== deletedId)
        }
      )
      // Remove single project query
      queryClient.removeQueries({ queryKey: ["project", deletedId] })
    },
  })

  return useQuery<Project[]>({
    queryKey,
    queryFn: async () => {
      // Set user context for RLS (cached, only called once per session)
      await ensureUserContext(supabase, userEmail)

      let query = supabase
        .from("projects")
        .select(`
          *,
          department:departments(id, name),
          owner:users!projects_owner_id_fkey(id, name, email)
        `)
        .order("created_at", { ascending: false })

      if (options?.status) {
        query = query.eq("status", options.status)
      }

      if (options?.limit) {
        query = query.limit(options.limit)
        if (options?.page) {
          query = query.range(
            (options.page - 1) * options.limit,
            options.page * options.limit - 1
          )
        }
      }

      const { data: projects, error } = await query

      if (error) throw error
      if (!projects || projects.length === 0) return []
      
      const projectsWithCollaborators = await attachCollaboratorsToProjects(supabase, projects)
      return await enrichProjectsWithImages(supabase, projectsWithCollaborators)
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds for list views
  })
}

export function useProject(projectId: string, options?: { enabled?: boolean; realtime?: boolean }) {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  const enabled = !!projectId && (options?.enabled !== false)
  const realtime = options?.realtime !== false

  // Real-time subscription for specific project
  useRealtimeSubscription({
    table: "projects",
    filter: `id=eq.${projectId}`,
    enabled: enabled && realtime,
    onUpdate: async (payload) => {
      // Fetch full project with relations
      try {
        await ensureUserContext(supabase, userEmail)
        const { data: project, error } = await supabase
          .from("projects")
          .select(`
            *,
            department:departments(id, name),
            owner:users!projects_owner_id_fkey(id, name, email)
          `)
          .eq("id", projectId)
          .single()

        if (!error && project) {
          const [projectWithCollaborators] = await attachCollaboratorsToProjects(supabase, [project])
          // Enrich with images
          const enrichedProjects = await enrichProjectsWithImages(supabase, [projectWithCollaborators])
          const enrichedProject = enrichedProjects[0]
          
          queryClient.setQueryData<{ project: Project }>(["project", projectId], { project: enrichedProject })
          // Also update in projects list
          queryClient.setQueriesData<Project[]>(
            { queryKey: ["projects"] },
            (old) => {
              if (!old) return old
              const index = old.findIndex(p => p.id === projectId)
              if (index !== -1) {
                const newProjects = [...old]
                newProjects[index] = enrichedProject
                return newProjects
              }
              return old
            }
          )
        }
      } catch (error) {
        console.error("Error fetching updated project:", error)
        queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      }
    },
    onDelete: () => {
      // Remove project from cache
      queryClient.removeQueries({ queryKey: ["project", projectId] })
      queryClient.setQueriesData<Project[]>(
        { queryKey: ["projects"] },
        (old) => old ? old.filter(p => p.id !== projectId) : old
      )
    },
  })

  return useQuery<{ project: Project }>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      // Set user context for RLS (cached, only called once per session)
      await ensureUserContext(supabase, userEmail)

      const { data: project, error } = await supabase
        .from("projects")
        .select(`
          *,
          department:departments(id, name),
          owner:users!projects_owner_id_fkey(id, name, email)
        `)
        .eq("id", projectId)
        .single()

      if (error) throw error
      if (!project) throw new Error("Project not found")
      
      const [projectWithCollaborators] = await attachCollaboratorsToProjects(supabase, [project])
      const enrichedProjects = await enrichProjectsWithImages(supabase, [projectWithCollaborators])
      return { project: enrichedProjects[0] }
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute for detail views
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  
  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      status?: string
      department_id?: string
      require_sqa?: boolean
      links?: string[]
      collaborator_ids?: string[]
    }) => {
      if (!userEmail) throw new Error("Not authenticated")
      
      // Get current user ID (context already set by ensureUserContext)
      await ensureUserContext(supabase, userEmail)
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", userEmail)
        .single()

      if (!user) throw new Error("User not found")

      const payload = {
        ...data,
        owner_id: user.id,
        status: data.status || "open",
        links: prepareLinkPayload(data.links),
        collaborator_ids: Array.isArray(data.collaborator_ids) ? data.collaborator_ids : [],
        require_sqa: data.require_sqa ?? false,
      }

      // Create project
      const { data: project, error } = await supabase
        .from("projects")
        .insert(payload)
        .select(`
          *,
          department:departments(id, name),
          owner:users!projects_owner_id_fkey(id, name, email)
        `)
        .single()

      if (error) throw error
      if (!project) throw new Error("Failed to create project")
      
      const [projectWithCollaborators] = await attachCollaboratorsToProjects(supabase, [project])
      const enrichedProjects = await enrichProjectsWithImages(supabase, [projectWithCollaborators])
      return { project: enrichedProjects[0] }
    },
    onSuccess: (data) => {
      // Optimistically update cache
      queryClient.setQueriesData<Project[]>(
        { queryKey: ["projects"] },
        (old) => old ? [data.project, ...old] : [data.project]
      )
    },
  })
}

export function useUpdateProject() {
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
      description?: string
      status?: string
      department_id?: string
      require_sqa?: boolean
      owner_id?: string | null
      links?: string[]
      collaborator_ids?: string[]
    }) => {
      if (!userEmail) throw new Error("Not authenticated")
      
      await ensureUserContext(supabase, userEmail)

      const { links, collaborator_ids, ...rest } = data
      const updatePayload: Record<string, any> = { ...rest }
      if (links !== undefined) {
        updatePayload.links = prepareLinkPayload(links)
      }
      if (collaborator_ids !== undefined) {
        updatePayload.collaborator_ids = Array.isArray(collaborator_ids) ? collaborator_ids : []
      }

      const { data: project, error } = await supabase
        .from("projects")
        .update(updatePayload)
        .eq("id", id)
        .select(`
          *,
          department:departments(id, name),
          owner:users!projects_owner_id_fkey(id, name, email)
        `)
        .single()

      if (error) throw error
      if (!project) throw new Error("Project not found")
      
      const [projectWithCollaborators] = await attachCollaboratorsToProjects(supabase, [project])
      const enrichedProjects = await enrichProjectsWithImages(supabase, [projectWithCollaborators])
      return { project: enrichedProjects[0] }
    },
    onMutate: async (variables) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["project", variables.id] })
      await queryClient.cancelQueries({ queryKey: ["projects"] })

      // Snapshot previous values
      const previousProject = queryClient.getQueryData<{ project: Project }>(["project", variables.id])
      const previousProjects = queryClient.getQueriesData<Project[]>({ queryKey: ["projects"] })

      // Optimistically update
      if (previousProject) {
        const updatedProject = { ...previousProject.project, ...variables }
        queryClient.setQueryData<{ project: Project }>(["project", variables.id], { project: updatedProject })
      }

      previousProjects.forEach(([queryKey, data]) => {
        if (data) {
          const updated = data.map(p => p.id === variables.id ? { ...p, ...variables } : p)
          queryClient.setQueryData<Project[]>(queryKey, updated)
        }
      })

      return { previousProject, previousProjects }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(["project", variables.id], context.previousProject)
      }
      if (context?.previousProjects) {
        context.previousProjects.forEach(([queryKey, data]) => {
          if (data) queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: (data) => {
      // Update cache with server response
      queryClient.setQueryData<{ project: Project }>(["project", data.project.id], { project: data.project })
      queryClient.setQueriesData<Project[]>(
        { queryKey: ["projects"] },
        (old) => {
          if (!old) return old
          const index = old.findIndex(p => p.id === data.project.id)
          if (index !== -1) {
            const newProjects = [...old]
            newProjects[index] = data.project
            return newProjects
          }
          return old
        }
      )
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userEmail) throw new Error("Not authenticated")
      
      await ensureUserContext(supabase, userEmail)

      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id)

      if (error) throw error
      return { id }
    },
    onMutate: async (id) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["project", id] })
      await queryClient.cancelQueries({ queryKey: ["projects"] })

      // Snapshot previous values
      const previousProject = queryClient.getQueryData<{ project: Project }>(["project", id])
      const previousProjects = queryClient.getQueriesData<Project[]>({ queryKey: ["projects"] })

      // Optimistically remove
      queryClient.removeQueries({ queryKey: ["project", id] })
      previousProjects.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData<Project[]>(queryKey, data.filter(p => p.id !== id))
        }
      })

      return { previousProject, previousProjects }
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(["project", id], context.previousProject)
      }
      if (context?.previousProjects) {
        context.previousProjects.forEach(([queryKey, data]) => {
          if (data) queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ["project", id] })
      queryClient.setQueriesData<Project[]>(
        { queryKey: ["projects"] },
        (old) => old ? old.filter(p => p.id !== id) : old
      )
    },
  })
}
