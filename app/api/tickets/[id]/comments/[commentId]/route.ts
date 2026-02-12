import { NextRequest, NextResponse } from "next/server"
import { requirePermission, getSupabaseWithUserContext } from "@/lib/auth-helpers"

export const runtime = "nodejs"

/** PATCH /api/tickets/[id]/comments/[commentId] – update own comment */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    await requirePermission("tickets", "edit")
    const { supabase, userId } = await getSupabaseWithUserContext()

    const { data: existing } = await supabase
      .from("ticket_comments")
      .select("id, author_id")
      .eq("id", params.commentId)
      .eq("ticket_id", params.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }
    if (existing.author_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { body: text } = body as { body?: string }
    if (text === undefined || typeof text !== "string") {
      return NextResponse.json(
        { error: "Comment body is required" },
        { status: 400 }
      )
    }

    const { data: comment, error } = await supabase
      .from("ticket_comments")
      .update({ body: text.trim() })
      .eq("id", params.commentId)
      .select(
        `
        id,
        ticket_id,
        parent_id,
        author_id,
        body,
        created_at,
        updated_at,
        author:users!ticket_comments_author_id_fkey(id, name, email)
      `
      )
      .single()

    if (error) {
      console.error("Error updating comment:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update comment" },
        { status: 500 }
      )
    }

    return NextResponse.json({ comment })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in PATCH /api/tickets/[id]/comments/[commentId]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/** DELETE /api/tickets/[id]/comments/[commentId] – delete own comment */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    await requirePermission("tickets", "edit")
    const { supabase, userId } = await getSupabaseWithUserContext()

    const { data: existing } = await supabase
      .from("ticket_comments")
      .select("id, author_id")
      .eq("id", params.commentId)
      .eq("ticket_id", params.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }
    if (existing.author_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await supabase
      .from("ticket_comments")
      .delete()
      .eq("id", params.commentId)

    if (error) {
      console.error("Error deleting comment:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete comment" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in DELETE /api/tickets/[id]/comments/[commentId]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
