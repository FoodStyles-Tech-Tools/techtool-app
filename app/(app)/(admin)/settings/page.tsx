"use client"

import Link from "next/link"
import { useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/hooks/use-permissions"
import UsersClientQuery from "../users/users-client-query"
import RolesClientQuery from "../roles/roles-client-query"
import StatusClient from "../status/status-client"
import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar"

const SETTINGS_TABS = [
  {
    key: "users",
    label: "Users",
    resource: "users" as const,
    action: "view" as const,
    Component: UsersClientQuery,
  },
  {
    key: "roles",
    label: "Roles",
    resource: "roles" as const,
    action: "view" as const,
    Component: RolesClientQuery,
  },
  {
    key: "status",
    label: "Status",
    resource: "status" as const,
    action: "manage" as const,
    Component: StatusClient,
  },
]

export default function SettingsPage() {
  const { hasPermission, loading } = usePermissions()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTab = searchParams.get("tab") || "users"

  const allowedTabs = useMemo(() => {
    return SETTINGS_TABS.filter((tab) => hasPermission(tab.resource, tab.action))
  }, [hasPermission])

  const preferredTab = useMemo(() => {
    const usersTab = allowedTabs.find((tab) => tab.key === "users")
    return usersTab || allowedTabs[0] || null
  }, [allowedTabs])

  const activeTab = useMemo(() => {
    return allowedTabs.find((tab) => tab.key === requestedTab) || preferredTab
  }, [allowedTabs, requestedTab, preferredTab])

  useEffect(() => {
    if (loading) return
    if (!allowedTabs.length) {
      router.replace("/dashboard")
      return
    }
    if (activeTab && activeTab.key !== requestedTab) {
      router.replace(`/settings?tab=${activeTab.key}`)
    }
  }, [activeTab, allowedTabs, loading, requestedTab, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-muted-foreground">No settings available.</p>
      </div>
    )
  }

  const ActiveComponent = activeTab.Component

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage users, roles, and ticket status settings
        </p>
      </div>

      <div className="border-b pb-2">
        <Menubar className="inline-flex h-auto border-none bg-muted p-1 rounded-lg">
          {allowedTabs.map((tab) => {
            const isActive = tab.key === activeTab.key
            return (
              <MenubarMenu key={tab.key}>
                <MenubarTrigger
                  asChild
                  className={cn(
                    "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Link href={`/settings?tab=${tab.key}`}>{tab.label}</Link>
                </MenubarTrigger>
              </MenubarMenu>
            )
          })}
        </Menubar>
      </div>

      <ActiveComponent />
    </div>
  )
}
