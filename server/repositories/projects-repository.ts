import { sanitizeLinkArray } from "@/lib/links"
import { HttpError } from "@server/http/http-error"

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase").createServerClient>>

type ProjectOwnerRecord = {
  id: string
  name: string | null
  email: string
  avatar_url?: string | null
} | null

type ProjectDepartmentRecord = {
  id: string
  name: string
} | null

type ProjectRowRecord = {
  id: string
  name: string
  description: string | null
  status: string
  require_sqa: boolean
  links: unknown
  created_at: string
  owner_id: string | null
  collaborator_ids: string[] | null
  requester_ids: string[] | null
  department_id?: string | null
  owner: ProjectOwnerRecord | ProjectOwnerRecord[]
  department: ProjectDepartmentRecord | ProjectDepartmentRecord[]
}

type RawProjectRecord = Omit<ProjectRowRecord, "owner" | "department"> & {
  owner: ProjectOwnerRecord
  department: ProjectDepartmentRecord
}

export type ProjectRecord = {
  id: string
  name: string
  description: string | null
  status: string
  require_sqa: boolean
  links: string[]
  created_at: string
  owner_id: string | null
  collaborator_ids: string[]
  requester_ids: string[]
  department_id?: string | null
  owner: { id: string; name: string | null; email: string; image: string | null } | null
  department: ProjectDepartmentRecord
  collaborators: Array<{ id: string; name: string | null; email: string; image: string | null }>
  requesters: Array<{ id: string; name: string | null; email: string; image: string | null }>
}

export type ProjectListResult = {
  projects: ProjectRecord[]
  count: number
}

type PinnedProject = {
  id: string
  name: string
  status: string
}

const PROJECT_SELECT = `
  id,
  name,
  description,
  status,
  require_sqa,
  links,
  created_at,
  owner_id,
  collaborator_ids,
  requester_ids,
  department_id,
  owner:users!projects_owner_id_fkey(id, name, email, avatar_url),
  department:departments(id, name)
`

async function fetchUsersByIds(supabase: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, { id: string; name: string | null; email: string; image: string | null }>()
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, avatar_url")
    .in("id", userIds)

  if (error) {
    console.error("Error fetching project users:", error)
    throw new HttpError(500, "Failed to fetch projects")
  }

  return new Map(
    (data || []).map((user) => [
      user.id,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.avatar_url || null,
      },
    ])
  )
}

function normalizeJoinedRecord<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function normalizeProjectRecord(project: ProjectRowRecord): RawProjectRecord {
  return {
    ...project,
    owner: normalizeJoinedRecord(project.owner),
    department: normalizeJoinedRecord(project.department),
  }
}

async function enrichProjects(
  supabase: SupabaseClient,
  projects: RawProjectRecord[]
): Promise<ProjectRecord[]> {
  if (projects.length === 0) return []

  const userIds = new Set<string>()
  projects.forEach((project) => {
    ;(project.collaborator_ids || []).forEach((id) => {
      if (id) userIds.add(id)
    })
    ;(project.requester_ids || []).forEach((id) => {
      if (id) userIds.add(id)
    })
  })

  const userMap = await fetchUsersByIds(supabase, Array.from(userIds))

  return projects.map((project) => {
    const collaboratorIds = Array.isArray(project.collaborator_ids) ? project.collaborator_ids : []
    const requesterIds = Array.isArray(project.requester_ids) ? project.requester_ids : []

    return {
      ...project,
      links: sanitizeLinkArray(project.links),
      collaborator_ids: collaboratorIds,
      requester_ids: requesterIds,
      owner: project.owner
        ? {
            id: project.owner.id,
            name: project.owner.name,
            email: project.owner.email,
            image: project.owner.avatar_url || null,
          }
        : null,
      collaborators: collaboratorIds
        .map((id) => userMap.get(id))
        .filter(
          (
            user
          ): user is { id: string; name: string | null; email: string; image: string | null } =>
            Boolean(user)
        ),
      requesters: requesterIds
        .map((id) => userMap.get(id))
        .filter(
          (
            user
          ): user is { id: string; name: string | null; email: string; image: string | null } =>
            Boolean(user)
        ),
    }
  })
}

export async function listProjects(
  supabase: SupabaseClient,
  options: { status?: string; page?: number; limit?: number }
): Promise<ProjectListResult> {
  const page = options.page ?? 1
  const limit = options.limit ?? null
  const offset = limit ? (page - 1) * limit : 0

  let query = supabase
    .from("projects")
    .select(PROJECT_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })

  if (limit) {
    query = query.range(offset, offset + limit - 1)
  }

  if (options.status) {
    query = query.eq("status", options.status)
  }

  const { data, error, count } = await query

  if (error) {
    console.error("Error fetching projects:", error)
    throw new HttpError(500, "Failed to fetch projects")
  }

  return {
    projects: await enrichProjects(supabase, (data || []).map(normalizeProjectRecord)),
    count: count || 0,
  }
}

export async function createProject(
  supabase: SupabaseClient,
  input: {
    name: string
    description: string | null
    owner_id: string
    status: string
    department_id: string | null
    collaborator_ids: string[]
    requester_ids: string[]
    require_sqa: boolean
    links: string[]
  }
) {
  const { data, error } = await supabase
    .from("projects")
    .insert(input)
    .select(PROJECT_SELECT)
    .single()

  if (error || !data) {
    console.error("Error creating project:", error)
    throw new HttpError(500, "Failed to create project")
  }

  const [project] = await enrichProjects(supabase, [normalizeProjectRecord(data)])
  return project
}

export async function getProjectById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("Error fetching project:", error)
    throw new HttpError(500, "Failed to fetch project")
  }

  if (!data) return null

  const [project] = await enrichProjects(supabase, [normalizeProjectRecord(data)])
  return project
}

export async function updateProject(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select(PROJECT_SELECT)
    .maybeSingle()

  if (error) {
    console.error("Error updating project:", error)
    throw new HttpError(500, "Failed to update project")
  }

  if (!data) return null

  const [project] = await enrichProjects(supabase, [normalizeProjectRecord(data)])
  return project
}

export async function getProjectTicketStats(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select("status")
    .eq("project_id", projectId)

  if (error) {
    console.error("Error fetching project ticket stats:", error)
    return { total: 0, open: 0, done: 0 }
  }

  const total = data?.length || 0
  const done = (data || []).filter(
    (ticket) => ticket.status === "completed" || ticket.status === "cancelled"
  ).length

  return {
    total,
    done,
    open: Math.max(0, total - done),
  }
}

export async function countProjectTickets(supabase: SupabaseClient, projectId: string) {
  const { count, error } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)

  if (error) {
    console.error("Error counting project tickets:", error)
    throw new HttpError(500, "Failed to fetch project")
  }

  return count || 0
}

export async function deleteProject(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting project:", error)
    throw new HttpError(500, "Failed to delete project")
  }
}

export async function listPinnedProjects(
  supabase: SupabaseClient,
  ids: string[]
): Promise<PinnedProject[]> {
  if (ids.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status")
    .in("id", ids)

  if (error) {
    console.error("Error fetching pinned projects:", error)
    throw new HttpError(500, "Failed to fetch pinned projects")
  }

  const byId = new Map<string, PinnedProject>()
  ;(data || []).forEach((project) => {
    byId.set(project.id, project as PinnedProject)
  })

  return ids
    .map((id) => byId.get(id))
    .filter((project): project is PinnedProject => Boolean(project))
}
