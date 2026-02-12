import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { buildPermissionFlags, getCurrentUserPermissions } from "@/lib/server/permissions"
import type { PermissionSnapshot } from "@/types/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getCurrentUserPermissions(session)
    const flags = buildPermissionFlags(user?.permissions ?? [])

    const payload: PermissionSnapshot = {
      user,
      flags,
      ts: Date.now(),
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (error) {
    console.error("Error in GET /api/v2/bootstrap:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
