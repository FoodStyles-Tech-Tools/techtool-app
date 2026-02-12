"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  Package,
  Ticket,
  Keyboard,
  Clock,
  Settings,
  ChevronDown,
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
    icon: LayoutDashboard,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    flag: "canViewProjects",
  },
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
  {
    title: "Tickets",
    href: "/tickets",
    icon: Ticket,
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
  const canOpenPreferences = flags?.canAccessSettings ?? false
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
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={true}
        className={cn(
          "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{item.title}</span>
      </Link>
    )
  }

  return (
    <aside className="h-full w-72 shrink-0 bg-muted/40">
      <div className="flex h-full flex-col">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <img src="/icon.svg" alt="TECHTOOL" className="h-9 w-9 rounded-md" />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold tracking-tight">TECHTOOL</p>
                <p className="text-xs text-muted-foreground">Workspace</p>
              </div>
            </div>
            <div className="pr-1">
              <CommentNotificationsDropdown />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1">
            <p className="px-2 text-xs font-medium text-muted-foreground">
              Platform
            </p>
            {primaryNavItems.filter(isVisible).map(renderNavLink)}
          </div>

          <div className="space-y-1">
            <p className="px-2 text-xs font-medium text-muted-foreground">
              Admin
            </p>
            {canOpenSettings && (
              <>
                <button
                  type="button"
                  onClick={() => setSettingsExpanded((current) => !current)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    settingsSectionActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 transition-transform",
                      settingsExpanded ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
                {settingsExpanded && (
                  <div className="ml-4 space-y-0.5 border-l pl-3">
                    {visibleSettingsItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={true}
                          className={cn(
                            "block rounded-md px-2 py-1.5 text-sm transition-colors",
                            isActive
                              ? "bg-accent text-accent-foreground"
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

        <div className="px-3 py-3 space-y-3">
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Keyboard className="h-4 w-4" />
            <span>Keyboard shortcuts</span>
          </button>
          <div>
            <VersionIndicator className="h-9" />
          </div>
          <NavUser
            user={{
              name: user?.name || "User",
              email: user?.email || "",
              avatar: user?.image || "",
            }}
            canOpenPreferences={canOpenPreferences}
            onOpenPreferences={() => setSettingsOpen(true)}
            onSignOut={handleSignOut}
          />
        </div>
        {canOpenPreferences && <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />}
        <KeyboardShortcutDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </div>
    </aside>
  )
}
