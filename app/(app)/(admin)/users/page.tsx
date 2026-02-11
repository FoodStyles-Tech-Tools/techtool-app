import { requirePagePermission } from "@/lib/server/require-page-permission"
import { getUsersWithImages } from "@/lib/server/users"
import UsersClient from "./users-client"

export default async function UsersPage() {
  await requirePagePermission("users", "view")
  const users = await getUsersWithImages()
  return <UsersClient initialUsers={users} />
}
