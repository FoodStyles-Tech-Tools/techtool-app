import { Navigate, Outlet, useLocation } from "react-router-dom"
import { AppShell } from "@client/components/layout/app-shell"
import { useSession } from "@client/lib/auth-client"
import { LoadingPill } from "@client/components/ui/loading-pill"

export function ProtectedLayout() {
  const location = useLocation()
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <LoadingPill label="Loading workspace..." />
      </div>
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
