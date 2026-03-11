import { useEffect } from "react"
import { getClientBackendUrl } from "@/lib/config/client-env"
import { useLocation } from "react-router-dom"
import { FullScreenMessage } from "./full-screen-message"

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
    <FullScreenMessage
      title="Completing sign-in"
      description="Finishing the authentication flow and redirecting you back into the app."
    />
  )
}
