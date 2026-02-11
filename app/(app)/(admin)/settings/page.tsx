import { redirect } from "next/navigation"
import { hasPermission, requireAuth } from "@/lib/auth-helpers"
import { getRolesWithPermissions } from "@/lib/server/roles"
import { getTicketStatuses } from "@/lib/server/statuses"
import { getUsersWithImages } from "@/lib/server/users"
import SettingsTabsClient from "./settings-tabs-client"

export default async function SettingsPage() {
  const session = await requireAuth()
  const canManageSettings = await hasPermission("settings", "manage", session)

  if (!canManageSettings) {
    redirect("/dashboard")
  }

  const [canViewUsers, canCreateUsers, canViewRoles, canManageStatus] = await Promise.all([
    hasPermission("users", "view", session),
    hasPermission("users", "create", session),
    hasPermission("roles", "view", session),
    hasPermission("status", "manage", session),
  ])

  const shouldLoadRoles = canViewRoles || canCreateUsers
  const [users, roles, statuses] = await Promise.all([
    canViewUsers ? getUsersWithImages() : Promise.resolve([]),
    shouldLoadRoles ? getRolesWithPermissions() : Promise.resolve([]),
    canManageStatus ? getTicketStatuses() : Promise.resolve([]),
  ])

  const allowedTabs = [
    canViewUsers ? { key: "users", label: "Users" } : null,
    canViewRoles ? { key: "roles", label: "Roles" } : null,
    canManageStatus ? { key: "status", label: "Status" } : null,
  ].filter(Boolean) as Array<{ key: "users" | "roles" | "status"; label: string }>

  return (
    <SettingsTabsClient
      users={users}
      roles={roles}
      statuses={statuses}
      allowedTabs={allowedTabs}
    />
  )
}
