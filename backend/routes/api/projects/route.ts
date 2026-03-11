import { NextRequest, NextResponse } from "@/backend/compat/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"
import { prepareLinkPayload, sanitizeLinkArray } from "@/lib/links"

export const runtime = 'nodejs'
const PROJECT_STATUSES = new Set(["active", "inactive"])

async function attachCollaboratorsToProjects(
  supabase: ReturnType<typeof createServerClient>,
  projects: any[]
) {
  if (!projects?.length) return projects

  const collaboratorIds = new Set<string>()
  const requesterIds = new Set<string>()
  projects.forEach((project) => {
    const collabIds: string[] = project.collaborator_ids || []
    const reqIds: string[] = project.requester_ids || []
    collabIds.forEach((id) => {
      if (id) collaboratorIds.add(id)
    })
    reqIds.forEach((id) => {
      if (id) requesterIds.add(id)
    })
  })

  const userIds = Array.from(new Set([...collaboratorIds, ...requesterIds]))
  if (userIds.length === 0) {
    return projects.map((project) => ({
      ...project,
      collaborator_ids: project.collaborator_ids || [],
      collaborators: [],
      requester_ids: project.requester_ids || [],
      requesters: [],
    }))
  }

  const { data: collaboratorUsers, error } = await supabase
    .from("users")
    .select("id, name, email, avatar_url")
    .in("id", userIds)

  if (error) {
    console.error("Error fetching collaborators:", error)
  }

  const collaboratorMap = new Map<string, any>()
  collaboratorUsers?.forEach((user) => collaboratorMap.set(user.id, user))

  return projects.map((project) => {
    const collaboratorIdList: string[] = project.collaborator_ids || []
    const requesterIdList: string[] = project.requester_ids || []
    const collaborators = collaboratorIdList
      .map((id) => collaboratorMap.get(id))
      .filter(Boolean)
    const requesters = requesterIdList
      .map((id) => collaboratorMap.get(id))
      .filter(Boolean)

    return {
      ...project,
      collaborator_ids: collaboratorIdList,
      collaborators,
      requester_ids: requesterIdList,
      requesters,
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission("projects", "view")
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const rawPage = searchParams.get("page")
    const rawLimit = searchParams.get("limit")
    const hasPagination = rawLimit !== null
    const page = Math.max(parseInt(rawPage || "1", 10), 1)
    const limit = hasPagination ? Math.max(parseInt(rawLimit || "10", 10), 1) : null
    const offset = limit ? (page - 1) * limit : 0

    let query = supabase
      .from("projects")
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, name, email, avatar_url),
        department:departments(id, name)
      `, { count: "exact" })
      .order("created_at", { ascending: false })

    if (limit) {
      query = query.range(offset, offset + limit - 1)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data: projects, error, count } = await query

    if (error) {
      console.error("Error fetching projects:", error)
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: 500 }
      )
    }

    if (!projects || projects.length === 0) {
      if (!limit) {
        return NextResponse.json({ projects: [] })
      }
      return NextResponse.json({
        projects: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    const projectsWithCollaborators = await attachCollaboratorsToProjects(supabase, projects)

    const enrichedProjects = projectsWithCollaborators.map(project => ({
      ...project,
      links: sanitizeLinkArray(project.links),
      owner: project.owner ? {
        ...project.owner,
        image: project.owner.avatar_url || null,
      } : project.owner,
      collaborators: (project.collaborators || []).map((collab: any) => ({
        ...collab,
        image: collab?.avatar_url || null,
      })),
      requesters: (project.requesters || []).map((requester: any) => ({
        ...requester,
        image: requester?.avatar_url || null,
      })),
    }))

    if (!limit) {
      return NextResponse.json({ projects: enrichedProjects })
    }

    return NextResponse.json({
      projects: enrichedProjects,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/projects:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("projects", "create")
    const supabase = createServerClient()

    const body = await request.json()
    const {
      name,
      description,
      status = "active",
      department_id,
      collaborator_ids,
      requester_ids,
      require_sqa,
      links,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    if (!PROJECT_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Invalid status. Allowed values: active, inactive" },
        { status: 400 }
      )
    }

    // Get user ID from users table
    const { data: owner } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single()

    if (!owner) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        name,
        description,
        owner_id: owner.id,
        status,
        department_id: department_id || null,
        collaborator_ids: Array.isArray(collaborator_ids) ? collaborator_ids : [],
        requester_ids: Array.isArray(requester_ids) ? requester_ids : [],
        require_sqa: require_sqa ?? false,
        links: prepareLinkPayload(Array.isArray(links) ? links : []),
      })
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, name, email, avatar_url),
        department:departments(id, name)
      `)
      .single()

    if (error) {
      console.error("Error creating project:", error)
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      )
    }

    const [projectWithCollaborators] = await attachCollaboratorsToProjects(supabase, [project])

    const enrichedProject = {
      ...projectWithCollaborators,
      links: sanitizeLinkArray(projectWithCollaborators.links),
      owner: projectWithCollaborators.owner
        ? {
            ...projectWithCollaborators.owner,
            image: projectWithCollaborators.owner.avatar_url || null,
          }
        : projectWithCollaborators.owner,
      collaborators: (projectWithCollaborators.collaborators || []).map((collab: any) => ({
        ...collab,
        image: collab?.avatar_url || null,
      })),
      requesters: (projectWithCollaborators.requesters || []).map((requester: any) => ({
        ...requester,
        image: requester?.avatar_url || null,
      })),
    }

    return NextResponse.json({ project: enrichedProject }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/projects:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


