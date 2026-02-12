import { NextRequest, NextResponse } from "next/server"
import { requirePermission, getSupabaseWithUserContext } from "@/lib/auth-helpers"
import type { TicketListItem, TicketPerson } from "@/types/api/tickets"
import type { CursorPage } from "@/types/api/common"
import { getOrSetServerCache } from "@/lib/server/cache"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function normalizeUser(value: any): { id: string; name: string | null; email: string } | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

function toTicketPerson(
  user: { id: string; name: string | null; email: string } | null,
  imageMap: Map<string, string | null>
): TicketPerson | null {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: imageMap.get(user.email) || null,
  }
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission("tickets", "view")
    const { supabase, userId } = await getSupabaseWithUserContext()

    const { searchParams } = new URL(request.url)
    const view = searchParams.get("view") || "list"
    if (view !== "list") {
      return NextResponse.json(
        { error: "Unsupported view. Use view=list." },
        { status: 400 }
      )
    }

    const projectId = searchParams.get("projectId")
    const assigneeId = searchParams.get("assigneeId")
    const departmentId = searchParams.get("departmentId")
    const requestedById = searchParams.get("requestedById")
    const status = searchParams.get("status")
    const excludeDone = searchParams.get("excludeDone") === "true"
    const query = searchParams.get("q")?.trim() || ""
    const cursor = searchParams.get("cursor")
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100)
    const cacheKey = [
      "v2:tickets",
      userId,
      projectId || "all",
      assigneeId || "all",
      departmentId || "all",
      requestedById || "all",
      status || "all",
      excludeDone ? "exclude_done" : "include_done",
      query || "",
      cursor || "",
      String(limit),
    ].join(":")

    const payload = await getOrSetServerCache<CursorPage<TicketListItem>>(
      cacheKey,
      30,
      async () => {
        let ticketsQuery = supabase
          .from("tickets")
          .select(
            `
            id,
            display_id,
            title,
            status,
            priority,
            type,
            created_at,
            updated_at,
            project:projects(id, name),
            assignee:users!tickets_assignee_id_fkey(id, name, email),
            department:departments(id, name)
          `
          )
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(limit + 1)

        if (projectId) {
          ticketsQuery = ticketsQuery.eq("project_id", projectId)
        }
        if (assigneeId) {
          if (assigneeId === "unassigned") {
            ticketsQuery = ticketsQuery.is("assignee_id", null)
          } else {
            ticketsQuery = ticketsQuery.eq("assignee_id", assigneeId)
          }
        }
        if (departmentId) {
          if (departmentId === "no_department") {
            ticketsQuery = ticketsQuery.is("department_id", null)
          } else {
            ticketsQuery = ticketsQuery.eq("department_id", departmentId)
          }
        }
        if (requestedById) {
          ticketsQuery = ticketsQuery.eq("requested_by_id", requestedById)
        }
        if (status) {
          ticketsQuery = ticketsQuery.eq("status", status)
        }
        if (excludeDone && status !== "completed" && status !== "cancelled") {
          ticketsQuery = ticketsQuery.not("status", "in", "(completed,cancelled)")
        }
        if (query) {
          const escaped = query.replace(/,/g, " ")
          ticketsQuery = ticketsQuery.or(`title.ilike.%${escaped}%,display_id.ilike.%${escaped}%`)
        }
        if (cursor) {
          ticketsQuery = ticketsQuery.lt("created_at", cursor)
        }

        const { data, error } = await ticketsQuery
        if (error) {
          throw error
        }

        const rows = data || []
        const pageRows = rows.slice(0, limit)
        const nextCursor =
          rows.length > limit ? pageRows[pageRows.length - 1]?.created_at || null : null

        const emails = new Set<string>()
        for (const row of pageRows) {
          const assignee = normalizeUser((row as any).assignee)
          if (assignee?.email) emails.add(assignee.email)
        }

        const imageMap = new Map<string, string | null>()
        if (emails.size > 0) {
          const { data: authUsers } = await supabase
            .from("auth_user")
            .select("email, image")
            .in("email", Array.from(emails))
          authUsers?.forEach((user) => {
            imageMap.set(user.email, user.image || null)
          })
        }

        return {
          data: pageRows.map((row: any) => {
            const assignee = normalizeUser(row.assignee)
            return {
              id: row.id,
              display_id: row.display_id,
              title: row.title,
              status: row.status,
              priority: row.priority,
              type: row.type,
              created_at: row.created_at,
              updated_at: row.updated_at,
              project: row.project
                ? Array.isArray(row.project)
                  ? row.project[0]
                  : row.project
                : null,
              assignee: toTicketPerson(assignee, imageMap),
              department: row.department
                ? Array.isArray(row.department)
                  ? row.department[0]
                  : row.department
                : null,
            }
          }),
          nextCursor,
        }
      }
    )

    return NextResponse.json(payload)
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching v2 tickets:", error)
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/v2/tickets:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
