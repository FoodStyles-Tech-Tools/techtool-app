"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "./use-permissions"

export function useRequirePermission(
  resource: "projects" | "tickets" | "users" | "roles" | "settings" | "assets" | "clockify" | "status",
  action: "view" | "create" | "edit" | "delete" | "manage"
) {
  const { flags, loading } = usePermissions()
  const router = useRouter()

  const canAccess = useMemo(() => {
    if (resource === "tickets" && action === "view") return flags?.canViewTickets ?? false
    if (resource === "projects" && action === "view") return flags?.canViewProjects ?? false
    if (resource === "assets" && action === "view") return flags?.canViewAssets ?? false
    if (resource === "clockify" && action === "view") return flags?.canViewClockify ?? false
    if (resource === "users" && action === "view") return flags?.canViewUsers ?? false
    if (resource === "roles" && action === "view") return flags?.canViewRoles ?? false
    if (resource === "status" && action === "manage") return flags?.canManageStatus ?? false
    if (resource === "settings" && action === "manage") return flags?.canManageSettings ?? false
    return false
  }, [flags, resource, action])

  useEffect(() => {
    if (!loading) {
      if (!canAccess) {
        // Redirect to dashboard if user doesn't have permission
        router.replace("/dashboard")
      }
    }
  }, [canAccess, loading, router])

  return { canAccess, loading }
}

