import { requirePagePermission } from "@/lib/server/require-page-permission"
import { getUsersWithImages } from "@/lib/server/users"
import { getRolesWithPermissions } from "@/lib/server/roles"
import UsersClient from "./users-client"

export default async function UsersPage() {
  await requirePagePermission("users", "view")
  const [users, roles] = await Promise.all([
    getUsersWithImages(),
    getRolesWithPermissions(),
  ])
  return <UsersClient initialUsers={users} roles={roles.map((role) => ({ id: role.id, name: role.name }))} />
}
