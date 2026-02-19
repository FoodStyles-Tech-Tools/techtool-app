import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

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
    .select("id, name, email")
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("projects", "view")
    const supabase = createServerClient()

    const { data: project, error } = await supabase
      .from("projects")
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, name, email),
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

    const emails = new Set<string>()
    if (projectWithCollaborators.owner?.email) emails.add(projectWithCollaborators.owner.email)
    projectWithCollaborators.collaborators?.forEach((collab: any) => {
      if (collab?.email) emails.add(collab.email)
    })
    projectWithCollaborators.requesters?.forEach((requester: any) => {
      if (requester?.email) emails.add(requester.email)
    })

    const { data: authUsers } = emails.size
      ? await supabase
          .from("auth_user")
          .select("email, image")
          .in("email", Array.from(emails))
      : { data: [] }

    const imageMap = new Map<string, string | null>()
    authUsers?.forEach((au) => {
      imageMap.set(au.email, au.image || null)
    })

    const enrichedProject = {
      ...projectWithCollaborators,
      owner: projectWithCollaborators.owner
        ? {
            ...projectWithCollaborators.owner,
            image: imageMap.get(projectWithCollaborators.owner.email) || null,
          }
        : projectWithCollaborators.owner,
      collaborators: (projectWithCollaborators.collaborators || []).map((collab: any) => ({
        ...collab,
        image: collab?.email ? imageMap.get(collab.email) || null : null,
      })),
      requesters: (projectWithCollaborators.requesters || []).map((requester: any) => ({
        ...requester,
        image: requester?.email ? imageMap.get(requester.email) || null : null,
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
    const { name, description, status, department_id, collaborator_ids, requester_ids, require_sqa } = body

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
    if (require_sqa !== undefined) updates.require_sqa = require_sqa
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
        owner:users!projects_owner_id_fkey(id, name, email),
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

    const emails = new Set<string>()
    if (projectWithCollaborators.owner?.email) emails.add(projectWithCollaborators.owner.email)
    projectWithCollaborators.collaborators?.forEach((collab: any) => {
      if (collab?.email) emails.add(collab.email)
    })
    projectWithCollaborators.requesters?.forEach((requester: any) => {
      if (requester?.email) emails.add(requester.email)
    })

    const { data: authUsers } = emails.size
      ? await supabase
          .from("auth_user")
          .select("email, image")
          .in("email", Array.from(emails))
      : { data: [] }

    const imageMap = new Map<string, string | null>()
    authUsers?.forEach((au) => {
      imageMap.set(au.email, au.image || null)
    })

    const enrichedProject = {
      ...projectWithCollaborators,
      owner: projectWithCollaborators.owner
        ? {
            ...projectWithCollaborators.owner,
            image: imageMap.get(projectWithCollaborators.owner.email) || null,
          }
        : projectWithCollaborators.owner,
      collaborators: (projectWithCollaborators.collaborators || []).map((collab: any) => ({
        ...collab,
        image: collab?.email ? imageMap.get(collab.email) || null : null,
      })),
      requesters: (projectWithCollaborators.requesters || []).map((requester: any) => ({
        ...requester,
        image: requester?.email ? imageMap.get(requester.email) || null : null,
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
