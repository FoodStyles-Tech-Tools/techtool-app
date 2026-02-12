import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.INTERNAL_REVALIDATE_TOKEN
    if (!expectedToken) {
      return NextResponse.json(
        { error: "Revalidation token is not configured" },
        { status: 503 }
      )
    }

    const receivedToken = request.headers.get("x-internal-revalidate-token")
    if (receivedToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const tags = Array.isArray(body?.tags)
      ? body.tags.filter((tag: unknown): tag is string => typeof tag === "string" && !!tag.trim())
      : []

    if (tags.length === 0) {
      return NextResponse.json({ error: "At least one cache tag is required" }, { status: 400 })
    }

    for (const tag of tags) {
      revalidateTag(tag)
    }

    return NextResponse.json({ revalidated: tags })
  } catch (error) {
    console.error("Error in POST /api/v2/revalidate:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
