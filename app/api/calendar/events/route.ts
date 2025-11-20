import { NextResponse } from "next/server"
import { getCurrentUserWithSupabase } from "@/lib/current-user"
import { fetchGoogleCalendarEvents, refreshAccessToken } from "@/lib/google-calendar"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { supabase, user } = await getCurrentUserWithSupabase()

    const { data: tokenRow, error } = await supabase
      .from("user_calendar_tokens")
      .select("id, refresh_token, access_token, access_token_expires_at, scope")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .maybeSingle()

    if (error) {
      console.error("Failed to load calendar token:", error)
      return NextResponse.json({ error: "Failed to load calendar connection" }, { status: 500 })
    }

    if (!tokenRow) {
      return NextResponse.json({ error: "Calendar not connected" }, { status: 404 })
    }

    let accessToken = tokenRow.access_token
    const expiresAt = tokenRow.access_token_expires_at
    const shouldRefresh =
      !accessToken ||
      !expiresAt ||
      new Date(expiresAt).getTime() <= Date.now() + 60 * 1000

    if (shouldRefresh) {
      try {
        const refreshed = await refreshAccessToken(tokenRow.refresh_token)
        accessToken = refreshed.access_token
        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

        await supabase
          .from("user_calendar_tokens")
          .update({
            access_token: refreshed.access_token,
            access_token_expires_at: newExpiresAt,
            scope: refreshed.scope || tokenRow.scope,
          })
          .eq("id", tokenRow.id)
      } catch (refreshError: any) {
        console.error("Failed to refresh calendar token:", refreshError)
        await supabase
          .from("user_calendar_tokens")
          .delete()
          .eq("id", tokenRow.id)
        return NextResponse.json(
          { error: "Calendar connection expired. Please reconnect." },
          { status: 401 }
        )
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Calendar token missing" }, { status: 500 })
    }

    const eventsResponse = await fetchGoogleCalendarEvents({ accessToken })
    return NextResponse.json({ events: eventsResponse.items || [] })
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
