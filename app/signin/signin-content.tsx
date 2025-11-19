"use client"

import { signIn } from "@/lib/auth-client"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

export function SignInContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Check for error in URL params (from OAuth callback)
  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      if (
        errorParam === "unable_to_create_user" ||
        errorParam.includes("not registered") ||
        errorParam.includes("unable_to_link_account")
      ) {
        setError("You are not registered")
      } else {
        setError("Failed to sign in. Please try again.")
      }
      // Clear the error from URL to prevent showing it again on refresh
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("error")
      window.history.replaceState({}, "", newUrl.toString())
    }
  }, [searchParams])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError(null)
      await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      })
    } catch (err) {
      console.error("Sign in error:", err)
      setError("Failed to sign in. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl text-gray-900">TechTool</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? "Signing in..." : "Sign in with Google"}
        </Button>
      </div>
    </div>
  )
}

