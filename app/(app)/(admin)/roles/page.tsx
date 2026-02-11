import { requirePagePermission } from "@/lib/server/require-page-permission"
import { getRolesWithPermissions } from "@/lib/server/roles"
import RolesClient from "./roles-client"

export default async function RolesPage() {
  await requirePagePermission("roles", "view")
  const roles = await getRolesWithPermissions()
  return <RolesClient initialRoles={roles} />
}
