import { useQuery } from "@tanstack/react-query"
import { requestJson } from "@client/lib/api"
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
    return null
  }

  return <RolesClient initialRoles={rolesQuery.data || []} />
}
