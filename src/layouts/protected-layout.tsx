import { Navigate, Outlet, useLocation } from "react-router-dom"
import { AppShell } from "@client/components/layout/app-shell"
import { useSession } from "@lib/auth-client"
import { FullScreenMessage } from "./full-screen-message"

export function ProtectedLayout() {
  const location = useLocation()
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <FullScreenMessage
        title="Loading workspace"
        description="Checking your session and preparing the app shell."
      />
    )
  }

  if (!session) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/signin?next=${next}`} replace />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
