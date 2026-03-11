import { useEffect } from "react"
import { getClientBackendUrl } from "@client/lib/config/client-env"
import { useLocation } from "react-router-dom"
import { LoadingPill } from "@client/components/ui/loading-pill"

export function AuthCallbackPage() {
  const location = useLocation()

  useEffect(() => {
    const currentUrl = new URL(window.location.href)
    const backendCallbackUrl = new URL("/auth/callback", getClientBackendUrl())
    backendCallbackUrl.search = location.search

    if (currentUrl.origin === backendCallbackUrl.origin) {
      return
    }

    window.location.replace(backendCallbackUrl.toString())
  }, [location.search])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <LoadingPill label="Completing sign-in..." />
    </div>
  )
}
