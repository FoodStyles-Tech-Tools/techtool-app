import { NextRequest, NextResponse } from "@/backend/compat/server"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get("error")

  const signinUrl = new URL(
    "/signin",
    process.env.VITE_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173"
  )
  if (error) {
    signinUrl.searchParams.set("error", error)
  }

  return NextResponse.redirect(signinUrl)
}




