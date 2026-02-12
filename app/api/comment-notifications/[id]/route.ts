import { NextRequest, NextResponse } from "next/server"
import { getSupabaseWithUserContext } from "@/lib/auth-helpers"

export const runtime = "nodejs"

/** PATCH /api/comment-notifications/[id] – mark notification as read (set read_at) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, userId } = await getSupabaseWithUserContext()

    const { data: existing } = await supabase
      .from("comment_notifications")
      .select("id, user_id")
      .eq("id", params.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }
    if (existing.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const readAt = new Date().toISOString()
    const { data: notification, error } = await supabase
      .from("comment_notifications")
      .update({ read_at: readAt })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error marking notification read:", error)
      return NextResponse.json(
        { error: "Failed to update notification" },
        { status: 500 }
      )
    }

    return NextResponse.json({ notification })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error in PATCH /api/comment-notifications/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
