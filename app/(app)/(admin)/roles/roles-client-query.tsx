"use client"

import { useRoles } from "@/hooks/use-roles"
import RolesClient from "./roles-client"

export default function RolesClientQuery() {
  const { data, isLoading } = useRoles()

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return <RolesClient initialRoles={data || []} />
}
