"use client"

import { signIn } from "@/lib/auth-client"
import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function SignInContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/tickets"

  // Force light theme on the sign-in page regardless of user preference
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

  // Check for error in URL params (from OAuth callback)
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
      // Clear the error from URL to prevent showing it again on refresh
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("error")
      window.history.replaceState({}, "", newUrl.toString())
    }
  }, [searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-900">
      <Card className="max-w-md w-full border border-slate-200 shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Sign in to TechTool App</CardTitle>
          <CardDescription className="text-xs md:text-sm text-slate-500">
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className={cn(
              "w-full gap-2 flex items-center",
              "justify-between flex-col"
            )}>
              <Button
                variant="outline"
                className={cn("w-full gap-2 h-11 bg-white hover:bg-slate-100")}
                disabled={loading}
                onClick={async () => {
                  await signIn.social(
                    {
                      provider: "google",
                      callbackURL: nextPath
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
                    },
                  )
                }}
              >
                {loading ? (
                  <>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in with Google
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


