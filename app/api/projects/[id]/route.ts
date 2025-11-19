import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requireProjectAccess, requireAdmin, requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

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

    // Get image from auth_user for owner
    let enrichedProject = project
    if (project.owner?.email) {
      const { data: authUser } = await supabase
        .from("auth_user")
        .select("image")
        .eq("email", project.owner.email)
        .single()
      
      enrichedProject = {
        ...enrichedProject,
        owner: {
          ...project.owner,
          image: authUser?.image || null,
        },
      }
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
    const { name, description, status, department_id } = body

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (status !== undefined) updates.status = status
    if (department_id !== undefined) updates.department_id = department_id || null

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

    // Get image from auth_user for owner
    let enrichedProject = project
    if (project.owner?.email) {
      const { data: authUser } = await supabase
        .from("auth_user")
        .select("image")
        .eq("email", project.owner.email)
        .single()
      
      enrichedProject = {
        ...enrichedProject,
        owner: {
          ...project.owner,
          image: authUser?.image || null,
        },
      }
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
