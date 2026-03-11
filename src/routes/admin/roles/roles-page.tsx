import { useQuery } from "@tanstack/react-query"
import { requestJson } from "@client/lib/api"
import { LoadingPill } from "@client/components/ui/loading-pill"
import RolesClient from "./roles-client"

type RoleRecord = {
  id: string
  name: string
  description: string | null
  is_system: boolean
  permissions: Array<{ id?: string; resource: string; action: string }>
  created_at: string
}

export function RolesPage() {
  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await requestJson<{ roles: RoleRecord[] }>("/api/roles")
      return response.roles
    },
  })

  if (rolesQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingPill label="Loading roles..." />
      </div>
    )
  }

  return <RolesClient initialRoles={rolesQuery.data || []} />
}
