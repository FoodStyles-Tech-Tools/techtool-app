"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "./use-permissions"

export function useRequirePermission(
  resource: "projects" | "tickets" | "users" | "roles" | "settings" | "assets",
  action: "view" | "create" | "edit" | "delete" | "manage"
) {
  const { hasPermission, loading } = usePermissions()
  const router = useRouter()

  const canAccess = useMemo(() => {
    return hasPermission(resource, action)
  }, [hasPermission, resource, action])

  useEffect(() => {
    if (!loading) {
      if (!canAccess) {
        // Redirect to dashboard if user doesn't have permission
        router.replace("/dashboard")
      }
    }
  }, [canAccess, loading, router])

  return { hasPermission: canAccess, loading }
}

