"use client"

import { signIn } from "@client/lib/auth-client"
import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Button } from "@client/components/ui/button"
import { Input } from "@client/components/ui/input"
import { Label } from "@client/components/ui/label"
import { FullScreenMessage } from "@client/layouts/full-screen-message"
import { getClientEnableEmailPasswordLogin } from "@client/lib/config/client-env"

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/tickets"
  }
  return value
}

function resolveSignInErrorMessage(errorValue: string | null) {
  if (!errorValue) return null

  const normalized = errorValue.toLowerCase()
  if (
    normalized === "not_registered" ||
    normalized === "unable_to_create_user" ||
    normalized.includes("not registered") ||
    normalized.includes("unable_to_link_account")
  ) {
    return "You are not registered"
  }
  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password."
  }

  return "Failed to sign in. Please try again."
}

export function SignInContent() {
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const nextPath = normalizeNextPath(searchParams.get("next"))
  const enableEmailPasswordLogin = getClientEnableEmailPasswordLogin()
  const isBusy = loadingGoogle || loadingPassword

  useEffect(() => {
    const errorParam = searchParams.get("error")
    const errorMessage = resolveSignInErrorMessage(errorParam)
    if (errorMessage) {
      setError(errorMessage)
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("error")
      window.history.replaceState({}, "", newUrl.toString())
    }
  }, [searchParams])

  return (
    <FullScreenMessage
      title="Sign in to TechTool App"
      description={
        enableEmailPasswordLogin
          ? "Use your email/password for local access, or continue with Google."
          : "Use your Google account to sign in."
      }
    >
      <div className="flex flex-col gap-4 text-left">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : null}
        {enableEmailPasswordLogin ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={async (event) => {
              event.preventDefault()
              await signIn.password(
                {
                  email,
                  password,
                },
                {
                  onRequest: () => {
                    setLoadingPassword(true)
                    setError(null)
                  },
                  onError: (nextError) => {
                    setLoadingPassword(false)
                    setError(resolveSignInErrorMessage(nextError.message))
                  },
                }
              )

              setLoadingPassword(false)
              setPassword("")
              navigate(nextPath, { replace: true })
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isBusy}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isBusy}
              />
            </div>
            <Button type="submit" variant="primary" className="h-11 w-full" disabled={isBusy}>
              {loadingPassword ? "Signing in..." : "Sign in with Email"}
            </Button>
          </form>
        ) : null}
        {enableEmailPasswordLogin ? (
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        ) : null}
        <Button
          variant="primary"
          className="h-11 w-full"
          disabled={isBusy}
          onClick={async () => {
            await signIn.social(
              {
                provider: "google",
                callbackURL: nextPath,
              },
              {
                onRequest: () => {
                  setLoadingGoogle(true)
                  setError(null)
                },
                onError: () => {
                  setLoadingGoogle(false)
                  setError("Failed to sign in. Please try again.")
                },
              }
            )
          }}
        >
          {loadingGoogle ? "Signing in..." : "Sign in with Google"}
        </Button>
      </div>
    </FullScreenMessage>
  )
}
