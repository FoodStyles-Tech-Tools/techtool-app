"use client"

import { signIn } from "@/lib/auth-client"
import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { FullScreenMessage } from "@/src/layouts/full-screen-message"

export function SignInContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const nextPath = searchParams.get("next") || "/tickets"

  useEffect(() => {
    const root = document.documentElement
    const hadDark = root.classList.contains("dark")
    const hadLight = root.classList.contains("light")

    root.classList.remove("dark")
    root.classList.add("light")
    root.style.colorScheme = "light"

    return () => {
      root.style.colorScheme = ""
      root.classList.remove("light")
      if (hadDark) root.classList.add("dark")
      else if (hadLight) root.classList.add("light")
    }
  }, [])

  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      if (
        errorParam === "not_registered" ||
        errorParam === "unable_to_create_user" ||
        errorParam.includes("not registered") ||
        errorParam.includes("unable_to_link_account")
      ) {
        setError("You are not registered")
      } else {
        setError("Failed to sign in. Please try again.")
      }

      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("error")
      window.history.replaceState({}, "", newUrl.toString())
    }
  }, [searchParams])

  return (
    <FullScreenMessage
      title="Sign in to TechTool App"
      description="Use your Google account to sign in."
    >
      <div className="flex flex-col gap-4 text-left">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : null}
        <Button
          variant="outline"
          className="h-11 w-full bg-white hover:bg-slate-100"
          disabled={loading}
          onClick={async () => {
            await signIn.social(
              {
                provider: "google",
                callbackURL: nextPath,
              },
              {
                onRequest: () => {
                  setLoading(true)
                  setError(null)
                },
                onError: () => {
                  setLoading(false)
                  setError("Failed to sign in. Please try again.")
                },
              }
            )
          }}
        >
          {loading ? "Signing in..." : "Sign in with Google"}
        </Button>
      </div>
    </FullScreenMessage>
  )
}
