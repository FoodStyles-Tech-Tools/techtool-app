"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { useSupabaseClient } from "@/lib/supabase-client"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"

const sanitizeLinkArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim()
      if (item && typeof item === "object" && "url" in item && typeof (item as any).url === "string") {
        return (item as any).url.trim()
      }
      return ""
    })
    .filter((url) => url.length > 0)
}

const prepareLinkPayload = (links?: string[]): string[] => {
  if (!links) return []
  return links
    .map((link) => (typeof link === "string" ? link.trim() : ""))
    .filter((url) => url.length > 0)
}

interface Project {
  id: string
  name: string
  description: string | null
  status: string
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
  }
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
    owner: project.owner ? {
      ...project.owner,
      image: imageMap.get(project.owner.email) || null,
    } : project.owner,
  })) as Project[]
}

export function useProjects(options?: { status?: string; limit?: number; page?: number }) {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  const queryKey = ["projects", options?.status, options?.limit, options?.page]

  // Real-time subscription for projects
  useRealtimeSubscription({
    table: "projects",
    enabled: true,
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
          // Enrich with images
          const enrichedProjects = await enrichProjectsWithImages(supabase, [project])
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
          // Enrich with images
          const enrichedProjects = await enrichProjectsWithImages(supabase, [project])
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
      
      // Enrich projects with images from auth_user
      return await enrichProjectsWithImages(supabase, projects)
    },
    staleTime: 30 * 1000, // 30 seconds for list views
  })
}

export function useProject(projectId: string) {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  // Real-time subscription for specific project
  useRealtimeSubscription({
    table: "projects",
    filter: `id=eq.${projectId}`,
    enabled: !!projectId,
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
          // Enrich with images
          const enrichedProjects = await enrichProjectsWithImages(supabase, [project])
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
      
      // Enrich with images
      const enrichedProjects = await enrichProjectsWithImages(supabase, [project])
      return { project: enrichedProjects[0] }
    },
    enabled: !!projectId,
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
      links?: string[]
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
      
      // Enrich with images
      const enrichedProjects = await enrichProjectsWithImages(supabase, [project])
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
      owner_id?: string | null
      links?: string[]
    }) => {
      if (!userEmail) throw new Error("Not authenticated")
      
      await ensureUserContext(supabase, userEmail)

      const { links, ...rest } = data
      const updatePayload: Record<string, any> = { ...rest }
      if (links !== undefined) {
        updatePayload.links = prepareLinkPayload(links)
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
      
      // Enrich with images
      const enrichedProjects = await enrichProjectsWithImages(supabase, [project])
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

