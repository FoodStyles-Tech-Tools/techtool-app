import { Navigate } from "react-router-dom"
import { usePermissions } from "@/hooks/use-permissions"
import { FullScreenMessage } from "./full-screen-message"

export function SettingsRedirectPage() {
  const { flags, loading } = usePermissions()

  if (loading) {
    return (
      <FullScreenMessage
        title="Loading settings"
        description="Resolving the right section for your permissions."
      />
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
