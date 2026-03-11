"use client"

import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { type PermissionFlags, usePermissions } from "@/hooks/use-permissions"

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

type SidebarProps = {
  className?: string
  onNavigate?: () => void
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = useLocation().pathname
  const { flags } = usePermissions()

  const isVisible = (item: { flag?: keyof PermissionFlags; visible?: (flags: PermissionFlags) => boolean }) =>
    item.visible ? item.visible(flags) : item.flag ? Boolean(flags[item.flag]) : true

  const navItems = [...primaryNavItems.filter(isVisible), ...adminItems.filter(isVisible)]

  return (
    <aside
      className={cn(
        "bg-white border-r border-slate-200",
        className
      )}
    >
      <div className="flex h-full flex-col px-3 py-4">
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-900">TECHTOOL</p>
              <p className="text-xs text-slate-500">Ticketing</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = isPathActive(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-9 items-center rounded-md px-2 text-sm text-slate-700 transition-colors",
                    isActive ? ACTIVE_ITEM_CLASS : "hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}

