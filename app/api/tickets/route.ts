import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    await requirePermission("tickets", "view")
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("project_id")
    const assigneeId = searchParams.get("assignee_id")
    const status = searchParams.get("status")
    const departmentId = searchParams.get("department_id")
    const requestedById = searchParams.get("requested_by_id")
    const excludeDone = searchParams.get("exclude_done") === "true"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    let query = supabase
      .from("tickets")
      .select(`
        *,
        project:projects(id, name),
        assignee:users!tickets_assignee_id_fkey(id, name, email),
        sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email),
        requested_by:users!tickets_requested_by_id_fkey(id, name, email),
        department:departments(id, name),
        epic:epics(id, name, color),
        sprint:sprints(id, name, status, start_date, end_date)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (projectId) {
      query = query.eq("project_id", projectId)
    }
    if (assigneeId) {
      if (assigneeId === "unassigned") {
        query = query.is("assignee_id", null)
      } else {
        query = query.eq("assignee_id", assigneeId)
      }
    }
    if (status) {
      query = query.eq("status", status)
    }
    if (departmentId) {
      if (departmentId === "no_department") {
        query = query.is("department_id", null)
      } else {
        query = query.eq("department_id", departmentId)
      }
    }
    if (requestedById) {
      query = query.eq("requested_by_id", requestedById)
    }
    if (excludeDone) {
      // Exclude both completed and cancelled statuses
      // PostgREST syntax: status.not.in.(completed,cancelled)
      query = query.not("status", "in", "(completed,cancelled)")
    }

    const { data: tickets, error, count } = await query

    if (error) {
      console.error("Error fetching tickets:", error)
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 }
      )
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({
        tickets: [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    }

    // Get images from auth_user for all assignees, SQA assignees, and requested_by
    const emails = new Set<string>()
    tickets.forEach(ticket => {
      if (ticket.assignee?.email) emails.add(ticket.assignee.email)
      if (ticket.sqa_assignee?.email) emails.add(ticket.sqa_assignee.email)
      if (ticket.requested_by?.email) emails.add(ticket.requested_by.email)
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
    
    // Enrich tickets with images
    const enrichedTickets = tickets.map(ticket => ({
      ...ticket,
      assignee: ticket.assignee ? {
        ...ticket.assignee,
        image: imageMap.get(ticket.assignee.email) || null,
      } : null,
      sqa_assignee: ticket.sqa_assignee ? {
        ...ticket.sqa_assignee,
        image: imageMap.get(ticket.sqa_assignee.email) || null,
      } : null,
    }))

    return NextResponse.json({
      tickets: enrichedTickets,
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
    console.error("Error in GET /api/tickets:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("tickets", "create")
    const supabase = createServerClient()

    const body = await request.json()
    const {
      project_id,
      title,
      description,
      assignee_id,
      sqa_assignee_id,
      sqa_assigned_at,
      requested_by_id,
      priority = "medium",
      type = "task",
      status = "open",
      department_id,
      epic_id,
      sprint_id,
    } = body

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    // Get user ID from users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .maybeSingle()

    if (userError) {
      console.error("Error fetching user:", userError)
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: 500 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Use provided requested_by_id or default to current user
    const finalRequestedById = requested_by_id || user.id

    // Set timestamps based on assignee and status
    const now = new Date().toISOString()
    
    const assignedAt = assignee_id ? now : null
    const sqaAssignedAt = sqa_assigned_at ?? (sqa_assignee_id ? now : null)
    let startedAt: string | null = null
    let completedAt: string | null = null
    
    // If status is "in_progress", set started_at
    if (status === "in_progress") {
      startedAt = now
    }
    
    // If status is "cancelled" or "completed", set completed_at and started_at
    if (status === "cancelled" || status === "completed") {
      completedAt = now
      startedAt = now // Also set started_at when completing
    }

    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert({
        project_id: project_id || null,
        title,
        description,
        assignee_id: assignee_id || null,
        sqa_assignee_id: sqa_assignee_id || null,
        sqa_assigned_at: sqaAssignedAt,
        assigned_at: assignedAt,
        started_at: startedAt,
        completed_at: completedAt,
        requested_by_id: finalRequestedById,
        priority,
        type,
        status,
        department_id: department_id || null,
        epic_id: epic_id || null,
        sprint_id: sprint_id || null,
      })
      .select(`
        *,
        project:projects(id, name),
        assignee:users!tickets_assignee_id_fkey(id, name, email),
        sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email),
        requested_by:users!tickets_requested_by_id_fkey(id, name, email),
        department:departments(id, name),
        epic:epics(id, name, color),
        sprint:sprints(id, name, status)
      `)
      .single()

    if (error) {
      console.error("Error creating ticket:", error)
      // Handle coercion error specifically
      if (error.message?.includes("coerce") || error.message?.includes("single JSON")) {
        console.error("Multiple rows returned after ticket creation")
        return NextResponse.json(
          { error: "Ticket creation data inconsistency detected" },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: "Failed to create ticket" },
        { status: 500 }
      )
    }

      // Get images from auth_user for assignee, SQA assignee, and requested_by
      const emails = new Set<string>()
      if (ticket.assignee?.email) emails.add(ticket.assignee.email)
      if (ticket.sqa_assignee?.email) emails.add(ticket.sqa_assignee.email)
      if (ticket.requested_by?.email) emails.add(ticket.requested_by.email)
      
      let enrichedTicket = ticket
      if (emails.size > 0) {
        const { data: authUsers } = await supabase
          .from("auth_user")
          .select("email, image")
          .in("email", Array.from(emails))
        
        // Create a map of email -> image
        const imageMap = new Map<string, string | null>()
        authUsers?.forEach(au => {
          imageMap.set(au.email, au.image || null)
        })
        
        // Enrich ticket with images
        enrichedTicket = {
          ...ticket,
          assignee: ticket.assignee ? {
            ...ticket.assignee,
            image: imageMap.get(ticket.assignee.email) || null,
          } : null,
          sqa_assignee: ticket.sqa_assignee ? {
            ...ticket.sqa_assignee,
            image: imageMap.get(ticket.sqa_assignee.email) || null,
          } : null,
        }
      }

      return NextResponse.json({ ticket: enrichedTicket }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/tickets:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

