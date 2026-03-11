"use client"

import Link from "@/src/compat/link"
import { useRouter, usePathname } from "@/src/compat/router"
import { cn } from "@/lib/utils"
import { CommentNotificationsDropdown } from "@/components/comment-notifications-dropdown"
import { signOut, useSession } from "@/lib/auth-client"
import { type PermissionFlags, usePermissions } from "@/hooks/use-permissions"
import { useSignOutOverlay } from "@/components/signout-overlay"
import { NavUser } from "@/components/layout/nav-user"

const ACTIVE_ITEM_CLASS = "bg-blue-50 text-blue-700"

type NavItem = {
  title: string
  href: string
  flag?: keyof PermissionFlags
}

type AdminItem = {
  title: string
  href: string
  flag?: keyof PermissionFlags
  visible?: (flags: PermissionFlags) => boolean
}

const primaryNavItems: NavItem[] = [
  {
    title: "Tickets",
    href: "/tickets",
    flag: "canViewTickets",
  },
  {
    title: "Projects",
    href: "/projects",
    flag: "canViewProjects",
  },
  {
    title: "Reports",
    href: "/report/guild-lead-report",
    flag: "canViewClockify",
  },
]

const adminItems: AdminItem[] = [
  {
    title: "Users",
    href: "/users",
    flag: "canViewUsers",
  },
  {
    title: "Roles",
    href: "/roles",
    flag: "canViewRoles",
  },
  {
    title: "Statuses",
    href: "/status",
    flag: "canManageStatus",
  },
  {
    title: "Epics",
    href: "/epics",
    flag: "canEditProjects",
  },
  {
    title: "Sprints",
    href: "/sprints",
    flag: "canEditProjects",
  },
  {
    title: "Deleted Tickets",
    href: "/deleted-tickets",
    flag: "canViewTickets",
  },
  {
    title: "Assets",
    href: "/assets",
    flag: "canViewAssets",
  },
  {
    title: "Clockify",
    href: "/clockify",
    flag: "canViewClockify",
  },
]

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { flags } = usePermissions()
  const { show: showOverlay, hide: hideOverlay } = useSignOutOverlay()

  const isVisible = (item: { flag?: keyof PermissionFlags; visible?: (flags: PermissionFlags) => boolean }) =>
    item.visible ? item.visible(flags) : item.flag ? Boolean(flags[item.flag]) : true

  const visibleAdminItems = adminItems.filter(isVisible)

  const handleSignOut = async () => {
    try {
      showOverlay()
      await signOut()
      router.push("/signin")
    } finally {
      hideOverlay()
    }
  }

  const user = session?.user

  return (
    <aside className="h-full w-64 shrink-0 border-r bg-white">
      <div className="flex h-full flex-col px-3 py-3">
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-900">TECHTOOL</p>
                <p className="text-xs text-slate-500">Ticketing</p>
              </div>
            </div>
            <CommentNotificationsDropdown />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1">
            {primaryNavItems.filter(isVisible).map((item) => {
              const isActive = isPathActive(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-slate-600 transition-colors",
                    isActive ? ACTIVE_ITEM_CLASS : "hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <span>{item.title}</span>
                </Link>
              )
            })}

            {visibleAdminItems.length > 0 ? (
              <div className="pt-3">
                <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Admin
                </div>
                <div className="space-y-0.5">
                  {visibleAdminItems.map((item) => {
                    const isActive = isPathActive(pathname, item.href)

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={true}
                        className={cn(
                          "block rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors",
                          isActive ? ACTIVE_ITEM_CLASS : "hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        {item.title}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </nav>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <NavUser
            user={{
              name: user?.name || "User",
              email: user?.email || "",
              avatar: user?.image || "",
            }}
            onSignOut={handleSignOut}
          />
        </div>
      </div>
    </aside>
  )
}


