"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutGrid,
  FolderOpen,
  Box,
  Command,
  Timer,
  FileSpreadsheet,
  SlidersHorizontal,
  ClipboardList,
  ChevronDown,
  Pin,
  type LucideIcon,
} from "lucide-react"
import { CommentNotificationsDropdown } from "@/components/comment-notifications-dropdown"
import { signOut, useSession } from "@/lib/auth-client"
import { SettingsDialog } from "@/components/settings/settings-dialog"
import { type PermissionFlags, usePermissions } from "@/hooks/use-permissions"
import { KeyboardShortcutDialog } from "@/components/keyboard-shortcut-dialog"
import { VersionIndicator } from "@/components/version-indicator"
import { useSignOutOverlay } from "@/components/signout-overlay"
import { NavUser } from "@/components/layout/nav-user"
import { usePinnedProjects } from "@/hooks/use-pinned-projects"

const SIDEBAR_ACTIVE_ITEM_CLASS =
  "border border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-300"

type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  flag?: keyof PermissionFlags
}

type SettingsItem = {
  title: string
  href: string
  flag?: keyof PermissionFlags
}

const primaryNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutGrid,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderOpen,
    flag: "canViewProjects",
  },
  {
    title: "Assets",
    href: "/assets",
    icon: Box,
    flag: "canViewAssets",
  },
  {
    title: "Clockify",
    href: "/clockify",
    icon: Timer,
    flag: "canViewClockify",
  },
  {
    title: "Report",
    href: "/report",
    icon: FileSpreadsheet,
    flag: "canViewClockify",
  },
  {
    title: "Tickets",
    href: "/tickets",
    icon: ClipboardList,
    flag: "canViewTickets",
  },
]

const settingsItems: SettingsItem[] = [
  {
    title: "User",
    href: "/users",
    flag: "canViewUsers",
  },
  {
    title: "Roles",
    href: "/roles",
    flag: "canViewRoles",
  },
  {
    title: "Status",
    href: "/status",
    flag: "canManageStatus",
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const { flags } = usePermissions()
  const canViewProjects = flags?.canViewProjects ?? false
  const { pinnedProjectIds, pinnedProjects, loading: pinnedProjectsLoading } = usePinnedProjects({
    enabled: canViewProjects,
  })
  const pinnedSectionActive = pinnedProjects.some((project) => {
    const href = `/projects/${project.id}`
    return pathname === href || pathname.startsWith(`${href}/`)
  })
  const isVisible = (item: { flag?: keyof PermissionFlags }) =>
    item.flag ? Boolean(flags[item.flag]) : true
  const visibleSettingsItems = settingsItems.filter(isVisible)
  const canOpenSettings = visibleSettingsItems.length > 0
  const settingsSectionActive =
    pathname === "/users" ||
    pathname.startsWith("/users/") ||
    pathname === "/roles" ||
    pathname.startsWith("/roles/") ||
    pathname === "/status" ||
    pathname.startsWith("/status/")
  const [settingsExpanded, setSettingsExpanded] = useState(settingsSectionActive)
  const [pinnedExpanded, setPinnedExpanded] = useState(true)
  const { show: showOverlay, hide: hideOverlay } = useSignOutOverlay()

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

  useEffect(() => {
    if (settingsSectionActive) {
      setSettingsExpanded(true)
    }
  }, [settingsSectionActive])

  useEffect(() => {
    if (pinnedSectionActive) {
      setPinnedExpanded(true)
    }
  }, [pinnedSectionActive])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.altKey
      if (!isModifierPressed || event.key !== "ArrowDown") {
        return
      }

      const target = event.target as HTMLElement | null
      const isInputElement =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable

      if (isInputElement) {
        return
      }

      event.preventDefault()
      setShortcutsOpen(true)
    }

    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon
    const isProjectsRootItem = item.href === "/projects"
    const isActive = isProjectsRootItem
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`)

    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={true}
        className={cn(
          "flex h-8 items-center gap-2 rounded-md border border-transparent px-2 text-sm transition-colors",
          isActive
            ? SIDEBAR_ACTIVE_ITEM_CLASS
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Icon className="h-4 w-4 stroke-[1.75]" />
        <span>{item.title}</span>
      </Link>
    )
  }

  return (
    <aside className="h-full w-72 shrink-0 bg-muted/40">
      <div className="flex h-full flex-col px-2 py-2">
        <div className="px-2 py-2">
          <div className="flex items-center justify-between gap-3 rounded-lg px-1 py-1">
            <div className="flex items-center gap-2.5">
              <img src="/icon.svg" alt="TECHTOOL" className="h-9 w-9 rounded-md" />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold tracking-tight">TECHTOOL</p>
                <p className="text-xs text-muted-foreground">Workspace</p>
              </div>
            </div>
            <div>
              <CommentNotificationsDropdown />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="space-y-1">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Platform
            </p>
            {primaryNavItems.filter(isVisible).map(renderNavLink)}
          </div>

          {canViewProjects && (
            <div className="mt-4 space-y-1">
              <button
                type="button"
                onClick={() => setPinnedExpanded((current) => !current)}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-md border border-transparent px-2 text-left text-sm transition-colors",
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Pin className="h-4 w-4 stroke-[1.75]" />
                <span>Pinned Projects</span>
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform",
                    pinnedExpanded ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>
              {pinnedExpanded && (
                <>
                  {pinnedProjectsLoading ? (
                    <p className="ml-2 px-2 py-1 text-xs text-muted-foreground">Loading...</p>
                  ) : pinnedProjectIds.length === 0 ? (
                    <p className="ml-2 px-2 py-1 text-xs text-muted-foreground">No pinned projects</p>
                  ) : (
                    <div className="ml-2 space-y-0.5 border-l pl-2">
                      {pinnedProjects.map((project) => {
                        const href = `/projects/${project.id}`
                        const isActive = pathname === href || pathname.startsWith(`${href}/`)
                        return (
                          <Link
                            key={project.id}
                            href={href}
                            prefetch={true}
                            className={cn(
                              "flex h-8 items-center rounded-md border border-transparent px-2 text-sm transition-colors",
                              isActive
                                ? SIDEBAR_ACTIVE_ITEM_CLASS
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <span className="truncate">{project.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="mt-4 space-y-1">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Admin
            </p>
            {canOpenSettings && (
              <>
                <button
                  type="button"
                  onClick={() => setSettingsExpanded((current) => !current)}
                  className={cn(
                    "flex h-8 w-full items-center gap-2 rounded-md border border-transparent px-2 text-left text-sm transition-colors",
                    "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4 stroke-[1.75]" />
                  <span>Settings</span>
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 transition-transform",
                      settingsExpanded ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
                {settingsExpanded && (
                  <div className="ml-2 space-y-0.5 border-l pl-2">
                    {visibleSettingsItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={true}
                          className={cn(
                            "block h-8 rounded-md border border-transparent px-2 py-1.5 text-sm leading-5 transition-colors",
                            isActive
                              ? SIDEBAR_ACTIVE_ITEM_CLASS
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          {item.title}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-2 px-2 pb-2 pt-2">
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className="flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <span className="flex items-center gap-2">
              <Command className="h-3.5 w-3.5 stroke-[1.75]" />
              <span>Shortcuts</span>
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <kbd className="rounded border border-border/60 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
                Alt
              </kbd>
              <span className="text-[10px] text-muted-foreground">/</span>
              <kbd className="rounded border border-border/60 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
                Cmd
              </kbd>
              <span className="text-[10px] text-muted-foreground">+</span>
              <kbd className="rounded border border-border/60 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
                ↓
              </kbd>
            </span>
          </button>
          <div>
            <VersionIndicator className="h-8 w-full rounded-md border-0 bg-transparent px-2 py-1.5 text-xs text-muted-foreground shadow-none transition-colors hover:bg-accent hover:text-accent-foreground" />
          </div>
          <NavUser
            user={{
              name: user?.name || "User",
              email: user?.email || "",
              avatar: user?.image || "",
            }}
            onOpenPreferences={() => setSettingsOpen(true)}
            onSignOut={handleSignOut}
          />
        </div>
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <KeyboardShortcutDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </div>
    </aside>
  )
}
