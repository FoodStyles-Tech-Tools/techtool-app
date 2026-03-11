import { NextRequest, NextResponse } from "@/backend/compat/server"
import { createServerClient } from "@/lib/supabase"
import { processDiscordOutboxBatch } from "@/lib/server/discord-outbox"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.INTERNAL_CRON_TOKEN
    if (!expectedToken) {
      return NextResponse.json(
        { error: "Internal cron token is not configured" },
        { status: 503 }
      )
    }

    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const limit = Number(body?.limit || 20)
    const clampedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 20

    const supabase = createServerClient()
    const result = await processDiscordOutboxBatch(supabase, clampedLimit)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in POST /api/internal/discord-outbox/process:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


