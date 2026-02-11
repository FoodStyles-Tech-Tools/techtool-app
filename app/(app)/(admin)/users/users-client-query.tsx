"use client"

import { useUsers } from "@/hooks/use-users"
import UsersClient from "./users-client"

export default function UsersClientQuery() {
  const { data, isLoading } = useUsers()

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return <UsersClient initialUsers={data || []} />
}
