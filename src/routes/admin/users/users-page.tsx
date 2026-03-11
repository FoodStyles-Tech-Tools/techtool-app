import { useQuery } from "@tanstack/react-query"
import { useUsers } from "@client/hooks/use-users"
import { requestJson } from "@client/lib/api"
import { LoadingPill } from "@client/components/ui/loading-pill"
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
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingPill label="Loading users..." />
      </div>
    )
  }

  return <UsersClient initialUsers={users} roles={rolesQuery.data || []} />
}
