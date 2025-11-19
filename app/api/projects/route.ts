import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    await requirePermission("projects", "view")
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    let query = supabase
      .from("projects")
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, name, email),
        department:departments(id, name)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

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

    // Get images from auth_user for all owners
    const emails = new Set<string>()
    projects.forEach(project => {
      if (project.owner?.email) emails.add(project.owner.email)
    })
    
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
    const enrichedProjects = projects.map(project => ({
      ...project,
      owner: project.owner ? {
        ...project.owner,
        image: imageMap.get(project.owner.email) || null,
      } : project.owner,
    }))

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
    const { name, description, status = "open", department_id } = body

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
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
      })
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, name, email),
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

    // Get image from auth_user for owner
    if (project.owner?.email) {
      const { data: authUser } = await supabase
        .from("auth_user")
        .select("image")
        .eq("email", project.owner.email)
        .single()
      
      project = {
        ...project,
        owner: {
          ...project.owner,
          image: authUser?.image || null,
        },
      }
    }

    return NextResponse.json({ project }, { status: 201 })
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

