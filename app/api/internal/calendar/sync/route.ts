import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { syncCalendarState } from "@/lib/server/calendar-sync"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.INTERNAL_CRON_TOKEN
    if (!expectedToken) {
      return NextResponse.json(
        { error: "Internal cron token is not configured" },
        { status: 503 }
      )
    }

    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServerClient()
    const body = await request.json().catch(() => ({}))
    const requestedUserId =
      typeof body?.user_id === "string" && body.user_id.trim().length > 0
        ? body.user_id
        : null

    let userIds: string[] = []
    if (requestedUserId) {
      userIds = [requestedUserId]
    } else {
      const { data: tokens, error } = await supabase
        .from("user_calendar_tokens")
        .select("user_id")
        .eq("provider", "google")

      if (error) {
        return NextResponse.json({ error: "Failed to load calendar users" }, { status: 500 })
      }

      const unique = new Set<string>()
      tokens?.forEach((row) => {
        if (row.user_id) unique.add(row.user_id)
      })
      userIds = Array.from(unique)
    }

    const results = await Promise.allSettled(
      userIds.map(async (userId) => {
        const state = await syncCalendarState(supabase, userId)
        return { userId, status: state.status, count: state.events.length }
      })
    )

    const synced = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    )
    const failed = results.flatMap((result) =>
      result.status === "rejected" ? [String(result.reason)] : []
    )

    return NextResponse.json({
      synced,
      failed,
    })
  } catch (error) {
    console.error("Error in POST /api/internal/calendar/sync:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
