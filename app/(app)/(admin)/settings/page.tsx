import { redirect } from "@/lib/server/legacy-page-navigation"
import { buildPermissionFlags, getCurrentUserPermissions } from "@/lib/server/permissions"

export default async function SettingsPage() {
  const user = await getCurrentUserPermissions()
  const flags = buildPermissionFlags(user?.permissions ?? [])

  if (flags.canViewUsers) {
    redirect("/users")
  }

  if (flags.canViewRoles) {
    redirect("/roles")
  }

  if (flags.canManageStatus) {
    redirect("/status")
  }

  if (flags.canEditProjects) {
    redirect("/epics")
  }

  if (flags.canViewTickets) {
    redirect("/deleted-tickets")
  }

  if (flags.canViewAssets) {
    redirect("/assets")
  }

  if (flags.canViewClockify) {
    redirect("/clockify")
  }

  redirect("/tickets")
}


