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
}

const SETTINGS_TABS = [
  {
    key: "users",
    label: "Users",
  },
  {
    key: "roles",
    label: "Roles",
  },
  {
    key: "status",
    label: "Status",
  },
]

export default function SettingsTabsClient({ users, roles, statuses }: SettingsTabsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTab = searchParams.get("tab") || "users"

  const allowedTabs = useMemo(() => SETTINGS_TABS, [])
  const preferredTab = useMemo(() => allowedTabs[0], [allowedTabs])
  const activeTab = useMemo(
    () => allowedTabs.find((tab) => tab.key === requestedTab) || preferredTab,
    [allowedTabs, requestedTab, preferredTab]
  )

  useEffect(() => {
    if (activeTab.key !== requestedTab) {
      router.replace(`/settings?tab=${activeTab.key}`)
    }
  }, [activeTab, requestedTab, router])

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

      {activeTab.key === "users" && <UsersClient initialUsers={users} roles={roles} />}
      {activeTab.key === "roles" && <RolesClient initialRoles={roles} />}
      {activeTab.key === "status" && <StatusClient initialStatuses={statuses} />}
    </div>
  )
}
