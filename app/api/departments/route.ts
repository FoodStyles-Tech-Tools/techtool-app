import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = 'nodejs'

export async function GET() {
  try {
    await requirePermission("projects", "view")
    const supabase = createServerClient()

    const { data: departments, error } = await supabase
      .from("departments")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching departments:", error)
      return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 })
    }

    return NextResponse.json({ departments: departments || [] })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/departments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission("projects", "edit")
    const supabase = createServerClient()
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
    }

    const { data: department, error } = await supabase
      .from("departments")
      .insert({ name: trimmedName })
      .select("*")
      .single()

    if (error) {
      console.error("Error creating department:", error)
      const message =
        error.code === "23505" ? "A department with this name already exists" : "Failed to create department"
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({ department }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/departments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


