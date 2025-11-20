import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { exchangeCodeForTokens } from "@/lib/google-calendar"
import { getCurrentUserWithSupabase } from "@/lib/current-user"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const errorParam = url.searchParams.get("error")

  const cookieStore = cookies()
  const storedState = cookieStore.get("google_oauth_state")?.value
  const returnTo = cookieStore.get("google_oauth_return")?.value || "/dashboard"
  const mode = cookieStore.get("google_oauth_mode")?.value || "redirect"

  cookieStore.delete("google_oauth_state")
  cookieStore.delete("google_oauth_return")
  cookieStore.delete("google_oauth_mode")

  if (errorParam) {
    if (mode === "popup") {
      return new Response(
        `<html><body><script>
          window.opener?.postMessage({ type: "calendar_connect", status: "error", error: "${errorParam}" }, window.location.origin);
          window.close();
        </script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }
    return NextResponse.redirect(`${returnTo}?calendar_error=${encodeURIComponent(errorParam)}`)
  }

  if (!code || !state || !storedState || state !== storedState) {
    if (mode === "popup") {
      return new Response(
        `<html><body><script>
          window.opener?.postMessage({ type: "calendar_connect", status: "error", error: "invalid_state" }, window.location.origin);
          window.close();
        </script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }
    return NextResponse.redirect(`${returnTo}?calendar_error=invalid_state`)
  }

  try {
    const { supabase, user } = await getCurrentUserWithSupabase()

    const { data: existingToken } = await supabase
      .from("user_calendar_tokens")
      .select("id, refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .maybeSingle()

    const tokenData = await exchangeCodeForTokens(code)
    const refreshToken = tokenData.refresh_token || existingToken?.refresh_token

    if (!refreshToken) {
      return NextResponse.redirect(`${returnTo}?calendar_error=missing_refresh_token`)
    }

    // Calculate expiration time based on expires_in (typically 3600 seconds = 1 hour)
    const expiresInSeconds = tokenData.expires_in || 3600
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

    const { error } = await supabase
      .from("user_calendar_tokens")
      .upsert({
        id: existingToken?.id,
        user_id: user.id,
        provider: "google",
        refresh_token: refreshToken,
        access_token: tokenData.access_token,
        access_token_expires_at: expiresAt,
        scope: tokenData.scope,
      }, { onConflict: "user_id,provider" })

    if (error) {
      console.error("Failed to store calendar tokens:", error)
      return NextResponse.redirect(`${returnTo}?calendar_error=storage_failed`)
    }

    if (mode === "popup") {
      return new Response(
        `<html><body><script>
          window.opener?.postMessage({ type: "calendar_connect", status: "success" }, window.location.origin);
          window.close();
        </script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    return NextResponse.redirect(`${returnTo}?calendar=connected`)
  } catch (error: any) {
    console.error("Calendar callback error:", error)
    const errMessage = error.message || "failed"
    if (mode === "popup") {
      return new Response(
        `<html><body><script>
          window.opener?.postMessage({ type: "calendar_connect", status: "error", error: "${errMessage.replace(/"/g, '\\"')}" }, window.location.origin);
          window.close();
        </script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }
    return NextResponse.redirect(`${returnTo}?calendar_error=${encodeURIComponent(errMessage)}`)
  }
}
