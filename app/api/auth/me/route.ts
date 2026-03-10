import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { getCurrentUserPermissions } from "@/lib/server/permissions"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth.api.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getCurrentUserPermissions(session)
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user,
      session,
    })
  } catch (error) {
    console.error("Error getting session:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
