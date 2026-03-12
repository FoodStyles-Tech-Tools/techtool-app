import { Navigate, Outlet, useLocation } from "react-router-dom"
import { AppShell } from "@client/components/layout/app-shell"
import { useSession } from "@client/lib/auth-client"

export function ProtectedLayout() {
  const location = useLocation()
  const { data: session, isPending } = useSession()

  if (isPending) {
    return null
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
