import { NextRequest, NextResponse } from "next/server"
import { getSupabaseWithUserContext } from "@/lib/auth-helpers"

export const runtime = "nodejs"

/** POST /api/comment-notifications/mark-read – mark notifications as read. Body: { ids?: string[] } to mark specific, or {} to mark all. */
export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseWithUserContext()

    let query = supabase
      .from("comment_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null)

    try {
      const body = await request.json().catch(() => ({}))
      const ids = body?.ids
      const ticketId = body?.ticket_id
      if (typeof ticketId === "string" && ticketId) {
        query = query.eq("ticket_id", ticketId)
      } else if (Array.isArray(ids) && ids.length > 0) {
        const validIds = ids.filter((id: unknown) => typeof id === "string")
        if (validIds.length > 0) query = query.in("id", validIds)
      }
    } catch {
      // no body or invalid JSON = mark all
    }

    const { error } = await query

    if (error) {
      console.error("Error marking notifications read:", error)
      return NextResponse.json(
        { error: "Failed to update notifications" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error in POST /api/comment-notifications/mark-read:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
