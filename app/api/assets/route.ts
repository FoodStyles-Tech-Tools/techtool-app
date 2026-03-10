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

async function enrichAssets(
  supabase: ReturnType<typeof createServerClient>,
  assets: AssetRow[]
) {
  if (!assets.length) return []

  const collaboratorIdSet = new Set<string>()
  assets.forEach((asset) => {
    const collaboratorIds = Array.isArray(asset.collaborator_ids) ? asset.collaborator_ids : []
    collaboratorIds.forEach((id) => {
      if (id) collaboratorIdSet.add(id)
    })
  })

  let collaboratorMap = new Map<
    string,
    { id: string; name: string | null; email: string; image: string | null }
  >()

  if (collaboratorIdSet.size > 0) {
    const collaboratorIds = Array.from(collaboratorIdSet)
    const { data: collaboratorUsers } = await supabase
      .from("users")
      .select("id, name, email, avatar_url")
      .in("id", collaboratorIds)

    collaboratorMap = new Map(
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
  }

  return assets.map((asset) => {
    const collaboratorIds = Array.isArray(asset.collaborator_ids) ? asset.collaborator_ids : []
    const collaborators = collaboratorIds
      .map((id) => collaboratorMap.get(id))
      .filter(
        (
          collaborator
        ): collaborator is { id: string; name: string | null; email: string; image: string | null } =>
          Boolean(collaborator)
      )

    return {
      ...asset,
      links: sanitizeLinkArray(asset.links),
      collaborator_ids: collaboratorIds,
      collaborators,
    }
  })
}

export async function GET() {
  try {
    await requirePermission("assets", "view")
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from("assets")
      .select("*, owner:users!assets_owner_id_fkey(id, name, email)")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching assets:", error)
      return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 })
    }

    const assets = await enrichAssets(supabase, (data || []) as AssetRow[])
    return NextResponse.json({ assets })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in GET /api/assets:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("assets", "create")
    const supabase = createServerClient()
    const body = await request.json()

    const {
      name,
      description,
      links,
      collaborator_ids,
      owner_id,
      production_url,
    } = body || {}

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .maybeSingle()

    if (!currentUser?.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const ownerId = typeof owner_id === "string" && owner_id ? owner_id : currentUser.id
    const collaboratorIds = Array.isArray(collaborator_ids) ? collaborator_ids.filter(Boolean) : []

    const { data: createdAsset, error } = await supabase
      .from("assets")
      .insert({
        name: name.trim(),
        description: description || null,
        links: prepareLinkPayload(Array.isArray(links) ? links : []),
        collaborator_ids: collaboratorIds,
        owner_id: ownerId,
        production_url: production_url || null,
      })
      .select("*, owner:users!assets_owner_id_fkey(id, name, email)")
      .single()

    if (error || !createdAsset) {
      console.error("Error creating asset:", error)
      return NextResponse.json(
        { error: error?.message || "Failed to create asset" },
        { status: 500 }
      )
    }

    const [asset] = await enrichAssets(supabase, [createdAsset as AssetRow])
    return NextResponse.json({ asset }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("permission")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("Error in POST /api/assets:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
