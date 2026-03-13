"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import type { ComponentType, SVGProps } from "react"
import {
  ChevronLeftIcon,
  TicketIcon,
  FolderIcon,
  ChartBarIcon,
  CubeIcon,
  ClockIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  StarIcon,
} from "@heroicons/react/20/solid"
import { cn } from "@client/lib/utils"
import { type PermissionFlags, usePermissions } from "@client/hooks/use-permissions"
import { usePinnedProjects } from "@client/hooks/use-pinned-projects"

const ACTIVE_ITEM_CLASS =
  "border border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary dark:font-medium"

type NavItem = {
  title: string
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
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
    icon: TicketIcon,
    flag: "canViewTickets",
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderIcon,
    flag: "canViewProjects",
  },
]

const reportsNavItem: NavItem = {
  title: "Reports",
  href: "/report",
  icon: ChartBarIcon,
  flag: "canViewClockify",
}

const assetsClockifyItems: NavItem[] = [
  {
    title: "Assets",
    href: "/assets",
    icon: CubeIcon,
    flag: "canViewAssets",
  },
  {
    title: "Clockify",
    href: "/clockify",
    icon: ClockIcon,
    flag: "canViewClockify",
  },
]

const settingsParents: SettingsParent[] = [
  {
    title: "User Management",
    children: [
      { title: "Users", href: "/users", flag: "canViewUsers" },
      { title: "Roles", href: "/roles", flag: "canViewRoles" },
      { title: "Audit Log", href: "/audit-log", flag: "canViewAuditLog" },
    ],
  },
  {
    title: "Workspace",
    children: [
      { title: "Status", href: "/status", flag: "canManageStatus" },
      { title: "Epics", href: "/epics", flag: "canEditProjects" },
      { title: "Sprints", href: "/sprints", flag: "canEditProjects" },
    ],
  },
]

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Projects list is active only on exact /projects, not on project detail pages. */
function isProjectsNavActive(pathname: string) {
  return pathname === "/projects"
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
  const [pinnedExpanded, setPinnedExpanded] = useState(true)
  const { pinnedProjects } = usePinnedProjects()

  const isVisible = (item: { flag?: keyof PermissionFlags }) =>
    item.flag ? Boolean(flags[item.flag]) : true

  const visiblePrimary = primaryNavItems.filter(isVisible)
  const visibleAssetsClockify = assetsClockifyItems.filter(isVisible)
  const showPinnedProjects = flags.canViewProjects && pinnedProjects.length > 0

  const hasAnySettingsChild = settingsParents.some((parent) =>
    parent.children.some((c) => isVisible(c))
  )

  const visibleSettingsChildren = settingsParents.flatMap((parent) =>
    parent.children.filter(isVisible).map((child) => ({ ...child }))
  )
  const reportsVisible = isVisible(reportsNavItem)

  return (
    <aside
      className={cn(
        "border-r border-border bg-card shadow-edge-r",
        className
      )}
    >
      <div className="flex h-full flex-col px-3 py-4">
        <div className="pb-4">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <img
                src="/techtool-logo.png"
                alt="Techtool logo"
                className="h-6 w-6 rounded-sm object-contain"
              />
              <p className="text-sm font-semibold text-foreground">Techtool</p>
            </div>

            {onToggleCollapsed ? (
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1">
            {visiblePrimary.map((item) => {
              const isActive =
                item.href === "/projects"
                  ? isProjectsNavActive(pathname)
                  : isPathActive(pathname, item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-foreground transition-colors duration-150",
                    isActive ? ACTIVE_ITEM_CLASS : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>

          {showPinnedProjects ? (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setPinnedExpanded((e) => !e)}
                className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
              >
                <StarIcon className="h-4 w-4 shrink-0 text-yellow-500" />
                <span>Pinned projects</span>
                {pinnedExpanded ? (
                  <ChevronDownIcon className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  pinnedExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mt-1 space-y-0.5 pl-6">
                    {pinnedProjects.map((project) => {
                      const href = `/projects/${project.id}`
                      const isActive = pathname === href || pathname.startsWith(`${href}/`)
                      return (
                        <Link
                          key={project.id}
                          to={href}
                          onClick={onNavigate}
                          className={cn(
                            "flex h-8 items-center gap-2 rounded-md px-2 text-sm text-foreground transition-colors duration-150",
                            isActive ? ACTIVE_ITEM_CLASS : "hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <span className="truncate">{project.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {reportsVisible ? (
            <nav className="mt-1 space-y-1">
              <Link
                to={reportsNavItem.href}
                onClick={onNavigate}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-foreground transition-colors duration-150",
                  isPathActive(pathname, reportsNavItem.href)
                    ? ACTIVE_ITEM_CLASS
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <ChartBarIcon className="h-4 w-4 shrink-0" />
                <span>{reportsNavItem.title}</span>
              </Link>
            </nav>
          ) : null}

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
                        "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-foreground transition-colors duration-150",
                        isActive ? ACTIVE_ITEM_CLASS : "hover:bg-accent hover:text-accent-foreground"
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
                  "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Cog6ToothIcon className="h-4 w-4 shrink-0" />
                <span>Settings</span>
                {settingsExpanded ? (
                  <ChevronDownIcon className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  settingsExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mt-1 space-y-0.5 pl-6">
                    {visibleSettingsChildren.map((child) => {
                      const isActive = isPathActive(pathname, child.href)
                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex h-8 items-center rounded-md px-2 text-sm text-foreground transition-colors duration-150",
                            isActive ? ACTIVE_ITEM_CLASS : "hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          {child.title}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

