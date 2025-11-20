import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    await requirePermission("projects", "view")
    const supabase = createServerClient()

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("project_id")

    if (!projectId) {
      return NextResponse.json(
        { error: "project_id is required" },
        { status: 400 }
      )
    }

    const { data: epics, error } = await supabase
      .from("epics")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching epics:", error)
      return NextResponse.json(
        { error: "Failed to fetch epics" },
        { status: 500 }
      )
    }

    return NextResponse.json({ epics: epics || [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/epics:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission("projects", "edit")
    const supabase = createServerClient()

    const body = await request.json()
    const { name, description, project_id, color } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    if (!project_id) {
      return NextResponse.json(
        { error: "project_id is required" },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      )
    }

    const { data: epic, error } = await supabase
      .from("epics")
      .insert({
        name: trimmedName,
        description: description || null,
        project_id,
        color: color || "#3b82f6",
      })
      .select("*")
      .single()

    if (error) {
      console.error("Error creating epic:", JSON.stringify(error, null, 2))
      // Return more detailed error message
      const errorMessage = error.message || "Failed to create epic"
      const errorCode = error.code || error.hint || "UNKNOWN"
      
      // Check if table doesn't exist (migration not run)
      if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
        return NextResponse.json(
          { error: "Epics table not found. Please run database migrations (024_create_epics.sql and 025_add_epic_id_to_tickets.sql).", details: errorMessage },
          { status: 500 }
        )
      }
      
      // Check for RLS policy violations
      if (errorMessage.includes("new row violates row-level security") || errorCode === "42501") {
        return NextResponse.json(
          { error: "Permission denied. Please check RLS policies.", details: errorMessage },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: errorMessage, code: errorCode, hint: error.hint },
        { status: 500 }
      )
    }

    return NextResponse.json({ epic }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/epics:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

