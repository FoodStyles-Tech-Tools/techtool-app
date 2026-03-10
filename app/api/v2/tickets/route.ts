import { NextRequest, NextResponse } from "next/server"
import { getRequestContext } from "@/lib/auth-helpers"
import type { CursorPage } from "@/types/api/common"
import { getOrSetServerCache } from "@/lib/server/cache"
import { getTicketCacheVersion } from "@/lib/server/ticket-cache"
import { fetchTicketList, parseTicketListQuery } from "@/lib/server/tickets-list"
import type { TicketListItem } from "@/types/api/tickets"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await getRequestContext({
      permission: { resource: "tickets", action: "view" },
      requireUserContext: false,
    })

    const { searchParams } = new URL(request.url)
    const view = searchParams.get("view") || "list"
    if (view !== "list") {
      return NextResponse.json(
        { error: "Unsupported view. Use view=list." },
        { status: 400 }
      )
    }

    const listQuery = parseTicketListQuery(searchParams)
    const cacheVersion = await getTicketCacheVersion()
    const cacheKey = [
      "v2:tickets",
      cacheVersion,
      userId,
      listQuery.projectId || "all",
      listQuery.parentTicketId || "all",
      listQuery.assigneeId || "all",
      listQuery.departmentId || "all",
      listQuery.sprintId || "all",
      listQuery.requestedById || "all",
      listQuery.status || "all",
      listQuery.excludeDone ? "exclude_done" : "include_done",
      listQuery.excludeSubtasks ? "exclude_subtasks" : "include_subtasks",
      listQuery.queryText || "",
      listQuery.cursor || "",
      String(listQuery.page || ""),
      String(listQuery.limit),
      listQuery.sortBy || "default",
      listQuery.sortDirection || "desc",
    ].join(":")

    const payload = await getOrSetServerCache<
      CursorPage<TicketListItem> & {
        items: TicketListItem[]
        pageInfo?: {
          page: number
          limit: number
          total: number
          totalPages: number
        }
      }
    >(
      cacheKey,
      30,
      async () => {
        const result = await fetchTicketList(supabase, listQuery)
        return {
          items: result.items,
          data: result.items,
          nextCursor: result.nextCursor,
          ...(result.pageInfo
            ? { pageInfo: result.pageInfo, pagination: result.pageInfo }
            : {}),
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
