import { NextRequest, NextResponse } from "@/backend/compat/server"
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

function redirectToSignIn(request: NextRequest, error: string) {
  const url = new URL("/signin", request.url)
  url.searchParams.set("error", error)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const error = request.nextUrl.searchParams.get("error")
  const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"))

  if (error) {
    return redirectToSignIn(request, error)
  }

  if (!code) {
    return redirectToSignIn(request, "missing_code")
  }

  const supabase = createServerClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error("Failed to exchange Supabase auth code:", exchangeError)
    return redirectToSignIn(request, "oauth_exchange_failed")
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    console.error("Failed to load Supabase user after OAuth callback:", userError)
    await supabase.auth.signOut()
    return redirectToSignIn(request, "unauthorized")
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
    return redirectToSignIn(request, "account_check_failed")
  }

  if (!appUser?.id) {
    await supabase.auth.signOut()
    return redirectToSignIn(request, "not_registered")
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

  return NextResponse.redirect(new URL(nextPath, request.url))
}


