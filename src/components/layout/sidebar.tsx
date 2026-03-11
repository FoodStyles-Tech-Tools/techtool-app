"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  PanelLeftClose,
  Ticket,
  FolderKanban,
  BarChart3,
  Package,
  Clock,
  Settings,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@client/lib/utils"
import { type PermissionFlags, usePermissions } from "@client/hooks/use-permissions"

const ACTIVE_ITEM_CLASS = "bg-blue-50 text-blue-700"

type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  flag?: keyof PermissionFlags
}

type SettingsChild = {
  title: string
  href: string
  flag?: keyof PermissionFlags
}

type SettingsParent = {
  title: string
  children: SettingsChild[]
}

const primaryNavItems: NavItem[] = [
  {
    title: "Tickets",
    href: "/tickets",
    icon: Ticket,
    flag: "canViewTickets",
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    flag: "canViewProjects",
  },
  {
    title: "Reports",
    href: "/report/guild-lead-report",
    icon: BarChart3,
    flag: "canViewClockify",
  },
]

const assetsClockifyItems: NavItem[] = [
  {
    title: "Assets",
    href: "/assets",
    icon: Package,
    flag: "canViewAssets",
  },
  {
    title: "Clockify",
    href: "/clockify",
    icon: Clock,
    flag: "canViewClockify",
  },
]

const settingsParents: SettingsParent[] = [
  {
    title: "User Management",
    children: [
      { title: "Users", href: "/users", flag: "canViewUsers" },
      { title: "Roles", href: "/roles", flag: "canViewRoles" },
    ],
  },
  {
    title: "Workspace",
    children: [
      { title: "Status", href: "/status", flag: "canManageStatus" },
      { title: "Epics", href: "/epics", flag: "canEditProjects" },
      { title: "Sprints", href: "/sprints", flag: "canEditProjects" },
      { title: "Deleted Tickets", href: "/deleted-tickets", flag: "canViewTickets" },
    ],
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
  const [settingsExpanded, setSettingsExpanded] = useState(false)

  const isVisible = (item: { flag?: keyof PermissionFlags }) =>
    item.flag ? Boolean(flags[item.flag]) : true

  const visiblePrimary = primaryNavItems.filter(isVisible)
  const visibleAssetsClockify = assetsClockifyItems.filter(isVisible)

  const hasAnySettingsChild = settingsParents.some((parent) =>
    parent.children.some((c) => isVisible(c))
  )

  const visibleSettingsChildren = settingsParents.flatMap((parent) =>
    parent.children.filter(isVisible).map((child) => ({ ...child }))
  )
  const isSettingsActive = visibleSettingsChildren.some((c) => isPathActive(pathname, c.href))

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
            <div className="flex items-center gap-2">
              <img
                src="/techtool-logo.png"
                alt="Techtool logo"
                className="h-6 w-6 rounded-sm object-contain"
              />
              <p className="text-sm font-semibold text-slate-900">Techtool</p>
            </div>

            {onToggleCollapsed ? (
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1">
            {visiblePrimary.map((item) => {
              const isActive = isPathActive(pathname, item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-slate-700 transition-colors",
                    isActive ? ACTIVE_ITEM_CLASS : "hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>

          {visibleAssetsClockify.length > 0 ? (
            <nav className="mt-1 space-y-1">
                {visibleAssetsClockify.map((item) => {
                  const isActive = isPathActive(pathname, item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-slate-700 transition-colors",
                        isActive ? ACTIVE_ITEM_CLASS : "hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  )
                })}
              </nav>
          ) : null}

          {hasAnySettingsChild ? (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setSettingsExpanded((e) => !e)}
                className={cn(
                  "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-slate-700 transition-colors",
                  isSettingsActive ? ACTIVE_ITEM_CLASS : "hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Settings</span>
                {settingsExpanded ? (
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-500" />
                ) : (
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-500" />
                )}
              </button>

              {settingsExpanded && (
                <div className="mt-1 space-y-0.5 border-l-2 border-slate-200 pl-3">
                  {visibleSettingsChildren.map((child) => {
                    const isActive = isPathActive(pathname, child.href)
                    return (
                      <Link
                        key={child.href}
                        to={child.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex h-8 items-center rounded-md px-2 text-sm text-slate-700 transition-colors",
                          isActive ? ACTIVE_ITEM_CLASS : "hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        {child.title}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

