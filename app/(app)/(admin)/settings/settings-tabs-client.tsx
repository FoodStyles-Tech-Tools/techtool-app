"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import UsersClient from "../users/users-client"
import RolesClient from "../roles/roles-client"
import StatusClient from "../status/status-client"
import { Menubar, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar"
import type { Role, User } from "@/lib/types"
import type { TicketStatus } from "@/lib/ticket-statuses"

type SettingsTabsClientProps = {
  users: User[]
  roles: Role[]
  statuses: TicketStatus[]
  allowedTabs: Array<{ key: "users" | "roles" | "status"; label: string }>
}

export default function SettingsTabsClient({
  users,
  roles,
  statuses,
  allowedTabs,
}: SettingsTabsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTab = searchParams.get("tab") || "users"

  const preferredTab = useMemo(() => allowedTabs[0], [allowedTabs])
  const activeTab = useMemo(
    () => allowedTabs.find((tab) => tab.key === requestedTab) || preferredTab,
    [allowedTabs, requestedTab, preferredTab]
  )

  useEffect(() => {
    if (!activeTab) return
    if (activeTab.key !== requestedTab) {
      router.replace(`/settings?tab=${activeTab.key}`)
    }
  }, [activeTab, requestedTab, router])

  if (!allowedTabs.length || !activeTab) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="typography-h3">Settings</h1>
          <p className="typography-muted mt-0.5">
            No settings sections are available for your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="typography-h3">Settings</h1>
        <p className="typography-muted mt-0.5">
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

      {activeTab.key === "users" && <UsersClient initialUsers={users} roles={roles} />}
      {activeTab.key === "roles" && <RolesClient initialRoles={roles} />}
      {activeTab.key === "status" && <StatusClient initialStatuses={statuses} />}
    </div>
  )
}
