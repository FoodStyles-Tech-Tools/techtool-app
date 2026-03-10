import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/auth-helpers"
import { createServerClient } from "@/lib/supabase"
import { prepareLinkPayload, sanitizeLinkArray } from "@/lib/links"

export const runtime = "nodejs"

type AssetRow = {
  id: string
  name: string
  description: string | null
  links: unknown
  production_url: string | null
  owner_id: string
  collaborator_ids: string[] | null
  created_at: string
  owner: { id: string; name: string | null; email: string } | null
}

async function enrichAsset(
  supabase: ReturnType<typeof createServerClient>,
  asset: AssetRow
) {
  const collaboratorIds = Array.isArray(asset.collaborator_ids) ? asset.collaborator_ids : []
  if (!collaboratorIds.length) {
    return {
      ...asset,
      links: sanitizeLinkArray(asset.links),
      collaborator_ids: collaboratorIds,
      collaborators: [],
    }
  }

  const { data: collaboratorUsers } = await supabase
    .from("users")
    .select("id, name, email, avatar_url")
    .in("id", collaboratorIds)

  const collaboratorById = new Map(
    (collaboratorUsers || []).map((user) => [
      user.id,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.avatar_url || null,
      },
    ])
  )

  return {
    ...asset,
    links: sanitizeLinkArray(asset.links),
    collaborator_ids: collaboratorIds,
    collaborators: collaboratorIds
      .map((id) => collaboratorById.get(id))
      .filter(Boolean),
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("assets", "edit")
    const supabase = createServerClient()
    const body = await request.json()

    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
      }
      updates.name = body.name.trim()
    }
    if (body.description !== undefined) {
      updates.description = body.description || null
    }
    if (body.production_url !== undefined) {
      updates.production_url = body.production_url || null
    }
    if (body.links !== undefined) {
      updates.links = prepareLinkPayload(Array.isArray(body.links) ? body.links : [])
    }
    if (body.collaborator_ids !== undefined) {
      updates.collaborator_ids = Array.isArray(body.collaborator_ids)
        ? body.collaborator_ids.filter(Boolean)
        : []
    }
    if (body.owner_id !== undefined) {
      updates.owner_id = body.owner_id || null
    }

    const { data: updatedAsset, error } = await supabase
      .from("assets")
      .update(updates)
      .eq("id", params.id)
      .select("*, owner:users!assets_owner_id_fkey(id, name, email)")
      .single()

    if (error || !updatedAsset) {
      console.error("Error updating asset:", error)
      return NextResponse.json(
        { error: error?.message || "Failed to update asset" },
        { status: 500 }
      )
    }

    const asset = await enrichAsset(supabase, updatedAsset as AssetRow)
    return NextResponse.json({ asset })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in PATCH /api/assets/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission("assets", "delete")
    const supabase = createServerClient()

    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", params.id)

    if (error) {
      console.error("Error deleting asset:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete asset" },
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
    console.error("Error in DELETE /api/assets/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
