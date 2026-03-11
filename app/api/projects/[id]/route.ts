import { NextRequest, NextResponse } from "@/backend/compat/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"
import { prepareLinkPayload, sanitizeLinkArray } from "@/lib/links"

export const runtime = 'nodejs'
const PROJECT_STATUSES = new Set(["active", "inactive"])

type ProjectTicketStats = {
  total: number
  open: number
  done: number
}

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

async function getProjectTicketStats(
  supabase: ReturnType<typeof createServerClient>,
  projectId: string
): Promise<ProjectTicketStats> {
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("status")
    .eq("project_id", projectId)

  if (error) {
    console.error("Error fetching project ticket stats:", error)
    return { total: 0, open: 0, done: 0 }
  }

  const total = tickets?.length || 0
  const done = (tickets || []).filter(
    (ticket) => ticket.status === "completed" || ticket.status === "cancelled"
  ).length

  return {
    total,
    done,
    open: Math.max(0, total - done),
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("projects", "view")
    const supabase = createServerClient()

    const { data: project, error } = await supabase
      .from("projects")
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, name, email, avatar_url),
        department:departments(id, name),
        tickets(count)
      `)
      .eq("id", params.id)
      .single()

    if (error || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const [projectWithCollaborators] = await attachCollaboratorsToProjects(supabase, [project])
    const ticketStats = await getProjectTicketStats(supabase, params.id)

    const enrichedProject = {
      ...projectWithCollaborators,
      ticket_stats: ticketStats,
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

    return NextResponse.json({ project: enrichedProject })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/projects/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("projects", "edit")
    const supabase = createServerClient()

    const body = await request.json()
    const { name, description, status, department_id, collaborator_ids, requester_ids, require_sqa, owner_id, links } = body

    if (status !== undefined && !PROJECT_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Invalid status. Allowed values: active, inactive" },
        { status: 400 }
      )
    }

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (status !== undefined) updates.status = status
    if (department_id !== undefined) updates.department_id = department_id || null
    if (owner_id !== undefined) updates.owner_id = owner_id || null
    if (require_sqa !== undefined) updates.require_sqa = require_sqa
    if (links !== undefined) {
      updates.links = prepareLinkPayload(Array.isArray(links) ? links : [])
    }
    if (collaborator_ids !== undefined) {
      updates.collaborator_ids = Array.isArray(collaborator_ids) ? collaborator_ids : []
    }
    if (requester_ids !== undefined) {
      updates.requester_ids = Array.isArray(requester_ids) ? requester_ids : []
    }

    const { data: project, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", params.id)
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, name, email, avatar_url),
        department:departments(id, name)
      `)
      .single()

    if (error) {
      console.error("Error updating project:", error)
      return NextResponse.json(
        { error: "Failed to update project" },
        { status: 500 }
      )
    }

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const [projectWithCollaborators] = await attachCollaboratorsToProjects(supabase, [project])
    const ticketStats = await getProjectTicketStats(supabase, params.id)

    const enrichedProject = {
      ...projectWithCollaborators,
      ticket_stats: ticketStats,
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

    return NextResponse.json({ project: enrichedProject })
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      )
    }
    console.error("Error in PATCH /api/projects/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("projects", "delete")
    const supabase = createServerClient()

    // Check if project has tickets
    const { count: ticketCount } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("project_id", params.id)

    const { searchParams } = new URL(request.url)
    const force = searchParams.get("force") === "true"

    if (ticketCount && ticketCount > 0 && !force) {
      return NextResponse.json(
        {
          error: "Cannot delete project with existing tickets",
          ticketCount,
        },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", params.id)

    if (error) {
      console.error("Error deleting project:", error)
      return NextResponse.json(
        { error: "Failed to delete project" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      )
    }
    console.error("Error in DELETE /api/projects/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


