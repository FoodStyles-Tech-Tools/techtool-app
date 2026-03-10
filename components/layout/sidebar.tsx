"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
import { type PermissionFlags, usePermissions } from "@/hooks/use-permissions"
import { KeyboardShortcutDialog } from "@/components/keyboard-shortcut-dialog"
import { VersionIndicator } from "@/components/version-indicator"
import { useSignOutOverlay } from "@/components/signout-overlay"
import { NavUser } from "@/components/layout/nav-user"
import { usePinnedProjects } from "@/hooks/use-pinned-projects"

const SIDEBAR_ACTIVE_ITEM_CLASS = "bg-blue-50 text-blue-700"

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
  visible?: (flags: PermissionFlags) => boolean
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
    title: "Tickets",
    href: "/tickets",
    icon: ClipboardList,
    flag: "canViewTickets",
  },
]

const reportSubItems: { title: string; href: string }[] = [
  { title: "Guild Lead Report", href: "/report/guild-lead-report" },
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
    title: "Deleted",
    href: "/deleted-tickets",
    flag: "canViewTickets",
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const { flags } = usePermissions()
  const canViewProjects = flags?.canViewProjects ?? false
  const { pinnedProjectIds, pinnedProjects, loading: pinnedProjectsLoading } = usePinnedProjects({
    enabled: canViewProjects,
  })
  const activeProjectId = searchParams?.get("projectId")
  const pinnedSectionActive =
    pathname === "/tickets" &&
    !!activeProjectId &&
    pinnedProjects.some((project) => project.id === activeProjectId)
  const reportSectionActive =
    pathname === "/report" ||
    pathname.startsWith("/report/guild-lead-report")
  const [reportExpanded, setReportExpanded] = useState(reportSectionActive)
  const isVisible = (item: { flag?: keyof PermissionFlags; visible?: (flags: PermissionFlags) => boolean }) =>
    item.visible ? item.visible(flags) : item.flag ? Boolean(flags[item.flag]) : true
  const visibleSettingsItems = settingsItems.filter(isVisible)
  const canOpenSettings = visibleSettingsItems.length > 0
  const settingsSectionActive =
    pathname === "/users" ||
    pathname.startsWith("/users/") ||
    pathname === "/roles" ||
    pathname.startsWith("/roles/") ||
    pathname === "/deleted-tickets" ||
    pathname.startsWith("/deleted-tickets/")
  const [settingsExpanded, setSettingsExpanded] = useState(settingsSectionActive)
  const workspaceSectionActive =
    pathname === "/workspace" || pathname.startsWith("/workspace/")
  const [workspaceExpanded, setWorkspaceExpanded] = useState(workspaceSectionActive)
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
    if (workspaceSectionActive) {
      setWorkspaceExpanded(true)
    }
  }, [workspaceSectionActive])

  useEffect(() => {
    if (pinnedSectionActive) {
      setPinnedExpanded(true)
    }
  }, [pinnedSectionActive])

  useEffect(() => {
    if (reportSectionActive) {
      setReportExpanded(true)
    }
  }, [reportSectionActive])

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
          "flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-slate-600 transition-colors",
          isActive ? SIDEBAR_ACTIVE_ITEM_CLASS : "hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        <Icon className="h-4 w-4 stroke-[1.75]" />
        <span>{item.title}</span>
      </Link>
    )
  }

  return (
    <aside className="h-full w-64 shrink-0 border-r bg-white">
      <div className="flex h-full flex-col px-3 py-3">
        <div className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Image src="/icon.svg" alt="TECHTOOL" width={36} height={36} className="h-9 w-9 rounded-md" />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-900">TECHTOOL</p>
                <p className="text-xs text-slate-500">Workspace</p>
              </div>
            </div>
            <div>
              <CommentNotificationsDropdown />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="space-y-1">
            <p className="px-2 py-1 text-xs font-medium uppercase text-slate-500">
              Platform
            </p>
            {primaryNavItems.filter(isVisible).map(renderNavLink)}
          </div>

          {isVisible({ flag: "canViewClockify" }) && (
            <div className="mt-4 space-y-1">
              <button
                type="button"
                onClick={() => setReportExpanded((current) => !current)}
                className={cn(
                  "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <FileSpreadsheet className="h-4 w-4 stroke-[1.75]" />
                <span>Report</span>
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform",
                    reportExpanded ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>
              {reportExpanded && (
                <div className="mt-1 space-y-0.5">
                  {reportSubItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={true}
                        className={cn(
                          "flex h-8 items-center rounded-md px-2 text-sm font-medium text-slate-600 transition-colors",
                          isActive ? SIDEBAR_ACTIVE_ITEM_CLASS : "hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <span>{item.title}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {canViewProjects && (
            <div className="mt-4 space-y-1">
              <button
                type="button"
                onClick={() => setPinnedExpanded((current) => !current)}
                className={cn(
                  "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
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
                    <p className="px-2 py-1 text-xs leading-4 text-slate-500">Loading pinned projects...</p>
                  ) : pinnedProjectIds.length === 0 ? (
                    <p className="px-2 py-1 text-xs leading-4 text-slate-500">No pinned projects</p>
                  ) : (
                    <div className="mt-1 space-y-0.5">
                      {pinnedProjects.map((project) => {
                        const href = `/tickets?projectId=${project.id}`
                        const isActive = pathname === "/tickets" && activeProjectId === project.id
                        return (
                          <Link
                            key={project.id}
                            href={href}
                            prefetch={true}
                            className={cn(
                              "flex h-8 items-center rounded-md px-2 text-sm font-medium text-slate-600 transition-colors",
                              isActive ? SIDEBAR_ACTIVE_ITEM_CLASS : "hover:bg-slate-100 hover:text-slate-900"
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
            <p className="px-2 py-1 text-xs font-medium uppercase text-slate-500">
              Admin
            </p>
            {canOpenSettings && (
              <>
                <button
                  type="button"
                  onClick={() => setSettingsExpanded((current) => !current)}
                  className={cn(
                    "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
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
                  <div className="mt-1 space-y-0.5">
                    {visibleSettingsItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={true}
                          className={cn(
                            "block h-8 rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors",
                            isActive ? SIDEBAR_ACTIVE_ITEM_CLASS : "hover:bg-slate-100 hover:text-slate-900"
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
            {Boolean(flags?.canManageStatus || flags?.canEditProjects) && (
              <div className="mt-1 space-y-1">
                <button
                  type="button"
                  onClick={() => setWorkspaceExpanded((current) => !current)}
                  className={cn(
                    "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <span>Workspace</span>
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 transition-transform",
                      workspaceExpanded ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
                {workspaceExpanded && (
                  <div className="mt-1 space-y-0.5">
                    {[
                      { title: "Status", href: "/workspace/status" },
                      { title: "Epic", href: "/workspace/epic" },
                      { title: "Sprint", href: "/workspace/sprint" },
                    ].map((item) => {
                      const isActive =
                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={true}
                          className={cn(
                            "block h-8 rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors",
                            isActive
                              ? SIDEBAR_ACTIVE_ITEM_CLASS
                              : "hover:bg-slate-100 hover:text-slate-900"
                          )}
                        >
                          {item.title}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 border-t px-2 pb-2 pt-2">
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className="flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <span className="flex items-center gap-2">
              <Command className="h-3.5 w-3.5 stroke-[1.75]" />
              <span>Shortcuts</span>
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] leading-none text-slate-500">
                Alt
              </kbd>
              <span className="text-[10px] text-slate-500">/</span>
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] leading-none text-slate-500">
                Cmd
              </kbd>
              <span className="text-[10px] text-slate-500">+</span>
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] leading-none text-slate-500">
                ↓
              </kbd>
            </span>
          </button>
          <div>
            <VersionIndicator className="h-8 w-full rounded-md border-0 bg-transparent px-2 py-1.5 text-xs font-medium text-slate-500 shadow-none" />
          </div>
          <NavUser
            user={{
              name: user?.name || "User",
              email: user?.email || "",
              avatar: user?.image || "",
            }}
            onSignOut={handleSignOut}
          />
        </div>
        <KeyboardShortcutDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </div>
    </aside>
  )
}
