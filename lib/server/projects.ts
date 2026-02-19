import "server-only"

import { getSupabaseWithUserContext } from "@/lib/auth-helpers"
import { sanitizeLinkArray } from "@/lib/links"
import { fetchUsersWithImages, type ServerUser } from "@/lib/server/users"

export type ProjectTicketStats = {
  total: number
  done: number
  percentage: number
}

export type ServerProject = {
  id: string
  name: string
  description: string | null
  status: "active" | "inactive"
  require_sqa: boolean
  links?: string[] | null
  created_at: string
  owner_id: string | null
  collaborator_ids: string[]
  department_id?: string | null
  department: { id: string; name: string } | null
  owner: { id: string; name: string | null; email: string; image: string | null } | null
  collaborators: Array<{ id: string; name: string | null; email: string; image: string | null }>
}

export async function getProjectsPageData(): Promise<{
  projects: ServerProject[]
  departments: Array<{ id: string; name: string }>
  users: ServerUser[]
  ticketStats: Record<string, ProjectTicketStats>
}> {
  const { supabase } = await getSupabaseWithUserContext()

  const [users, departmentsResult, projectsResult] = await Promise.all([
    fetchUsersWithImages(supabase),
    supabase.from("departments").select("id, name").order("name", { ascending: true }),
    supabase
      .from("projects")
      .select(
        "id, name, description, status, require_sqa, links, created_at, owner_id, collaborator_ids, department_id, department:departments(id, name)"
      )
      .order("name", { ascending: true }),
  ])

  if (projectsResult.error) {
    console.error("Failed to load projects:", projectsResult.error)
    return {
      projects: [],
      departments: departmentsResult.data || [],
      users,
      ticketStats: {},
    }
  }

  const userMap = new Map<string, ServerUser>()
  users.forEach((user) => userMap.set(user.id, user))

  const projects: ServerProject[] = (projectsResult.data || []).map((project: any) => {
    const collaboratorIds = Array.isArray(project.collaborator_ids)
      ? project.collaborator_ids
      : []
    const collaborators = collaboratorIds
      .map((id: string) => userMap.get(id))
      .filter((user: ServerUser | undefined): user is ServerUser => Boolean(user))
      .map((user: ServerUser) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      }))

    const owner = project.owner_id ? userMap.get(project.owner_id) : null

    return {
      ...project,
      links: sanitizeLinkArray(project.links),
      collaborator_ids: collaboratorIds,
      owner: owner
        ? { id: owner.id, name: owner.name, email: owner.email, image: owner.image }
        : null,
      collaborators,
    }
  })

  const projectIds = projects.map((project) => project.id)
  const ticketStats: Record<string, ProjectTicketStats> = {}

  if (projectIds.length > 0) {
    const { data: ticketRows, error: ticketError } = await supabase
      .from("tickets")
      .select("project_id, status")
      .in("project_id", projectIds)

    if (ticketError) {
      console.error("Failed to load ticket stats:", ticketError)
    } else if (ticketRows) {
      ticketRows.forEach((ticket: any) => {
        const projectId = ticket.project_id
        if (!projectId) return
        if (!ticketStats[projectId]) {
          ticketStats[projectId] = { total: 0, done: 0, percentage: 0 }
        }
        ticketStats[projectId].total += 1
        if (ticket.status === "completed" || ticket.status === "cancelled") {
          ticketStats[projectId].done += 1
        }
      })

      Object.entries(ticketStats).forEach(([projectId, stats]) => {
        stats.percentage = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0
        ticketStats[projectId] = stats
      })
    }
  }

  return {
    projects,
    departments: departmentsResult.data || [],
    users,
    ticketStats,
  }
}
