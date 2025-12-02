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

    const { data: sprints, error } = await supabase
      .from("sprints")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching sprints:", error)
      return NextResponse.json(
        { error: "Failed to fetch sprints" },
        { status: 500 }
      )
    }

    return NextResponse.json({ sprints: sprints || [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/sprints:", error)
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
    const { name, description, project_id, status, start_date, end_date } = body

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

    const { data: sprint, error } = await supabase
      .from("sprints")
      .insert({
        name: trimmedName,
        description: description || null,
        project_id,
        status: status || "planned",
        start_date: start_date || null,
        end_date: end_date || null,
      })
      .select("*")
      .single()

    if (error) {
      console.error("Error creating sprint:", JSON.stringify(error, null, 2))
      const errorMessage = error.message || "Failed to create sprint"
      const errorCode = error.code || error.hint || "UNKNOWN"
      
      if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
        return NextResponse.json(
          { error: "Sprints table not found. Please run database migrations (027_add_sprints.sql).", details: errorMessage },
          { status: 500 }
        )
      }
      
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

    return NextResponse.json({ sprint }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/sprints:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

