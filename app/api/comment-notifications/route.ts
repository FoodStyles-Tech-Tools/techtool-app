import { NextRequest, NextResponse } from "next/server"
import { getSupabaseWithUserContext } from "@/lib/auth-helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/comment-notifications – list current user's notifications (with unread count); optional ?unread_only */
export async function GET(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseWithUserContext()

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread_only") === "true"
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)

    let query = supabase
      .from("comment_notifications")
      .select(
        `
        id,
        user_id,
        type,
        comment_id,
        ticket_id,
        created_at,
        read_at,
        comment:ticket_comments(id, body, author_id, parent_id, created_at, author:users!ticket_comments_author_id_fkey(id, name, email, avatar_url)),
        ticket:tickets(id, display_id, title)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.is("read_at", null)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error("Error fetching comment notifications:", error)
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      )
    }

    const { count: unreadCount } = await supabase
      .from("comment_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: unreadCount ?? 0,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error in GET /api/comment-notifications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
