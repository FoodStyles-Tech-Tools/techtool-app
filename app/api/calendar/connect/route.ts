import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAuth } from "@/lib/auth-helpers"
import { buildGoogleAuthUrl } from "@/lib/google-calendar"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  await requireAuth()

  const state = crypto.randomUUID()
  const { searchParams } = new URL(request.url)
  const returnTo = searchParams.get("returnTo") || "/dashboard"
  const mode = searchParams.get("mode") === "popup" ? "popup" : "redirect"

  const cookieStore = cookies()
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 5,
    path: "/",
  })
  cookieStore.set("google_oauth_return", returnTo, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  })
  cookieStore.set("google_oauth_mode", mode, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  })

  const authUrl = buildGoogleAuthUrl(state)
  return NextResponse.redirect(authUrl)
}
