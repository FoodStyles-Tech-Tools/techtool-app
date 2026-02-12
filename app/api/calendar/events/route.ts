import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserWithSupabase } from "@/lib/current-user"
import { getCalendarStateWithCache, syncCalendarState } from "@/lib/server/calendar-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getCurrentUserWithSupabase()
    const force = new URL(request.url).searchParams.get("force") === "true"
    const calendar = force
      ? await syncCalendarState(supabase, user.id)
      : await getCalendarStateWithCache(supabase, user.id)

    if (calendar.status === "needs_connection") {
      return NextResponse.json({ error: "Calendar not connected" }, { status: 404 })
    }

    if (calendar.error) {
      return NextResponse.json({ error: calendar.error }, { status: 500 })
    }

    return NextResponse.json({ events: calendar.events })
  } catch (error: any) {
    if (error.message === "User record not found") {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error("Calendar events error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to load calendar events" },
      { status: 500 }
    )
  }
}
