import { NextRequest, NextResponse } from "@/backend/compat/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PinnedProject = {
  id: string
  name: string
  status: string
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission("projects", "view")
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const rawIds = searchParams.get("ids")

    const ids = rawIds
      ? rawIds
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : []

    if (ids.length === 0) {
      return NextResponse.json({ projects: [] })
    }

    const { data, error } = await supabase
      .from("projects")
      .select("id, name, status")
      .in("id", ids)

    if (error) {
      console.error("Error fetching pinned projects:", error)
      return NextResponse.json(
        { error: "Failed to fetch pinned projects" },
        { status: 500 }
      )
    }

    const byId = new Map<string, PinnedProject>()
    ;(data || []).forEach((project) => {
      byId.set(project.id, project as PinnedProject)
    })

    const projects = ids
      .map((id) => byId.get(id))
      .filter((project): project is PinnedProject => Boolean(project))

    return NextResponse.json({ projects })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/projects/pinned:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


