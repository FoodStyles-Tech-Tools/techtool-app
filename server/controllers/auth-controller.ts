import type { Request, Response } from "express"
import { auth } from "@/lib/auth"
import { getServerAppUrl } from "@/lib/config/server-env"
import { getUserDisplayName, getUserImage } from "@/lib/auth-session"
import { createServerClient } from "@/lib/supabase"
import { APP_VERSION } from "@/lib/version"
import { buildPermissionFlags, getCurrentUserPermissions } from "@/lib/server/permissions"
import type { PermissionSnapshot } from "@shared/types/auth"

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/tickets"
  }
  return value
}

function redirectToSignIn(response: Response, error: string, nextPath: string) {
  const url = new URL("/signin", getServerAppUrl())
  url.searchParams.set("error", error)
  url.searchParams.set("next", nextPath)
  response.redirect(url.toString())
}

export async function getAuthSessionController(_request: Request, response: Response) {
  try {
    const session = await auth.api.getSession()

    if (!session) {
      response.status(401).json({ error: "Unauthorized" })
      return
    }

    const user = await getCurrentUserPermissions(session)
    if (!user) {
      response.status(404).json({ error: "User not found" })
      return
    }

    response.json({ user, session })
  } catch (error) {
    console.error("Error getting session:", error)
    response.status(500).json({ error: "Internal server error" })
  }
}

export async function getBootstrapController(_request: Request, response: Response) {
  try {
    const session = await auth.api.getSession()

    if (!session) {
      response.status(401).json({ error: "Unauthorized" })
      return
    }

    const user = await getCurrentUserPermissions(session)
    const flags = buildPermissionFlags(user?.permissions ?? [])

    const payload: PermissionSnapshot = {
      user,
      flags,
      ts: Date.now(),
    }

    response.setHeader("Cache-Control", "private, max-age=60")
    response.json(payload)
  } catch (error) {
    console.error("Error in GET /api/v2/bootstrap:", error)
    response.status(500).json({ error: "Internal server error" })
  }
}

export function getVersionController(_request: Request, response: Response) {
  response.json({ version: APP_VERSION })
}

export function getAuthErrorController(request: Request, response: Response) {
  const error = typeof request.query.error === "string" ? request.query.error : null
  const signinUrl = new URL("/signin", getServerAppUrl())
  if (error) {
    signinUrl.searchParams.set("error", error)
  }
  response.redirect(signinUrl.toString())
}

export async function getAuthCallbackController(request: Request, response: Response) {
  const code = typeof request.query.code === "string" ? request.query.code : null
  const error = typeof request.query.error === "string" ? request.query.error : null
  const nextPath = normalizeNextPath(
    typeof request.query.next === "string" ? request.query.next : null
  )

  if (error) {
    redirectToSignIn(response, error, nextPath)
    return
  }

  if (!code) {
    redirectToSignIn(response, "missing_code", nextPath)
    return
  }

  const supabase = createServerClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error("Failed to exchange Supabase auth code:", exchangeError)
    redirectToSignIn(response, "oauth_exchange_failed", nextPath)
    return
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    console.error("Failed to load Supabase user after OAuth callback:", userError)
    await supabase.auth.signOut()
    redirectToSignIn(response, "unauthorized", nextPath)
    return
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
    redirectToSignIn(response, "account_check_failed", nextPath)
    return
  }

  if (!appUser?.id) {
    await supabase.auth.signOut()
    redirectToSignIn(response, "not_registered", nextPath)
    return
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

  response.redirect(new URL(nextPath, getServerAppUrl()).toString())
}
