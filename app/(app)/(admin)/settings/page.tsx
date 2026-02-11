import { requirePagePermission } from "@/lib/server/require-page-permission"
import { getRolesWithPermissions } from "@/lib/server/roles"
import { getTicketStatuses } from "@/lib/server/statuses"
import { getUsersWithImages } from "@/lib/server/users"
import SettingsTabsClient from "./settings-tabs-client"

export default async function SettingsPage() {
  await requirePagePermission("settings", "manage")

  const [users, roles, statuses] = await Promise.all([
    getUsersWithImages(),
    getRolesWithPermissions(),
    getTicketStatuses(),
  ])

  return (
    <SettingsTabsClient
      users={users}
      roles={roles}
      statuses={statuses}
    />
  )
}
