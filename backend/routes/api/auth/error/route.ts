import { NextRequest, NextResponse } from "@/backend/compat/server"
import { getServerAppUrl } from "@/lib/config/server-env"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get("error")

  const signinUrl = new URL("/signin", getServerAppUrl())
  if (error) {
    signinUrl.searchParams.set("error", error)
  }

  return NextResponse.redirect(signinUrl)
}




