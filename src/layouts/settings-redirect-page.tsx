import { Navigate } from "react-router-dom"
import { usePermissions } from "@client/hooks/use-permissions"
import { LoadingPill } from "@client/components/ui/loading-pill"

export function SettingsRedirectPage() {
  const { flags, loading } = usePermissions()

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingPill label="Loading settings..." />
      </div>
    )
  }

  if (flags.canViewUsers) return <Navigate to="/users" replace />
  if (flags.canViewRoles) return <Navigate to="/roles" replace />
  if (flags.canManageStatus) return <Navigate to="/status" replace />
  if (flags.canEditProjects) return <Navigate to="/epics" replace />
  if (flags.canViewTickets) return <Navigate to="/deleted-tickets" replace />
  if (flags.canViewAssets) return <Navigate to="/assets" replace />
  if (flags.canViewClockify) return <Navigate to="/clockify" replace />
  return <Navigate to="/tickets" replace />
}
