import { NextRequest, NextResponse } from "next/server"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get("error")
  
  // Redirect to signin page with error message
  const signinUrl = new URL("/signin", request.url)
  if (error) {
    signinUrl.searchParams.set("error", error)
  }
  
  return NextResponse.redirect(signinUrl)
}


