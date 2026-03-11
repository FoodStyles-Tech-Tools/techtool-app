"use client"

import { Link, useLocation } from "react-router-dom"
import { cn } from "@client/lib/utils"
import { type PermissionFlags, usePermissions } from "@client/hooks/use-permissions"

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
  onToggleCollapsed?: () => void
}

export function Sidebar({ className, onNavigate, onToggleCollapsed }: SidebarProps) {
  const pathname = useLocation().pathname
  const { flags } = usePermissions()

  const isVisible = (item: { flag?: keyof PermissionFlags; visible?: (flags: PermissionFlags) => boolean }) =>
    item.visible ? item.visible(flags) : item.flag ? Boolean(flags[item.flag]) : true

  const visiblePrimary = primaryNavItems.filter(isVisible)
  const visibleAdmin = adminItems.filter(isVisible)

  return (
    <aside
      className={cn(
        "border-r border-slate-200 bg-white",
        className
      )}
    >
      <div className="flex h-full flex-col px-3 py-4">
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-900">TECHTOOL</p>
              <p className="text-xs text-slate-500">Ticketing</p>
            </div>

            {onToggleCollapsed ? (
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1">
            {visiblePrimary.map((item) => {
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

          {visibleAdmin.length > 0 ? (
            <>
              <div className="my-3 border-t border-slate-200" />
              <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Workspace
              </p>
              <nav className="space-y-1">
                {visibleAdmin.map((item) => {
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
            </>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

