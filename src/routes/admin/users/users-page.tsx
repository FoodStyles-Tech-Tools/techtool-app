import { useQuery } from "@tanstack/react-query"
import { useUsers } from "@client/hooks/use-users"
import { requestJson } from "@client/lib/api"
import UsersClient from "./users-client"

export function UsersPage() {
  const { data: users = [], isLoading: usersLoading } = useUsers({ realtime: false })
  const rolesQuery = useQuery({
    queryKey: ["roles", "select"],
    queryFn: async () => {
      const response = await requestJson<{ roles: Array<{ id: string; name: string }> }>("/api/roles")
      return response.roles
    },
  })

  if (usersLoading || rolesQuery.isLoading) {
    return null
  }

  return <UsersClient initialUsers={users} roles={rolesQuery.data || []} />
}
