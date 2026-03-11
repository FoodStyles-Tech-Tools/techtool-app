import { NextRequest, NextResponse } from "@/backend/compat/server"
import { getServerAppUrl } from "@/lib/config/server-env"
import { getUserDisplayName, getUserImage } from "@/lib/auth-session"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function normalizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/tickets"
  }
  return value
}

function redirectToSignIn(error: string, nextPath: string) {
  const url = new URL("/signin", getServerAppUrl())
  url.searchParams.set("error", error)
  url.searchParams.set("next", nextPath)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const error = request.nextUrl.searchParams.get("error")
  const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"))

  if (error) {
    return redirectToSignIn(error, nextPath)
  }

  if (!code) {
    return redirectToSignIn("missing_code", nextPath)
  }

  const supabase = createServerClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error("Failed to exchange Supabase auth code:", exchangeError)
    return redirectToSignIn("oauth_exchange_failed", nextPath)
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    console.error("Failed to load Supabase user after OAuth callback:", userError)
    await supabase.auth.signOut()
    return redirectToSignIn("unauthorized", nextPath)
  }

  const email = user.email
  const name = getUserDisplayName(user)
  const image = getUserImage(user)

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (appUserError) {
    console.error("Failed to verify registered user:", appUserError)
    await supabase.auth.signOut()
    return redirectToSignIn("account_check_failed", nextPath)
  }

  if (!appUser?.id) {
    await supabase.auth.signOut()
    return redirectToSignIn("not_registered", nextPath)
  }

  const { error: updateUserError } = await supabase
    .from("users")
    .update({
      name,
      avatar_url: image,
    })
    .eq("email", email)

  if (updateUserError) {
    console.error("Failed to sync user profile:", updateUserError)
  }

  return NextResponse.redirect(new URL(nextPath, getServerAppUrl()))
}


