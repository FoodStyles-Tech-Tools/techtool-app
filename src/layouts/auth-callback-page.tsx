import { useEffect } from "react"
import { getClientBackendUrl } from "@client/lib/config/client-env"
import { useLocation } from "react-router-dom"

export function AuthCallbackPage() {
  const location = useLocation()

  useEffect(() => {
    const backendCallbackUrl = new URL("/auth/callback", getClientBackendUrl())
    backendCallbackUrl.search = location.search

    window.location.replace(backendCallbackUrl.toString())
  }, [location.search])

  return <div className="min-h-screen bg-muted" />
}
