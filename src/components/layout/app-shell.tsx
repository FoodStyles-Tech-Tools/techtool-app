import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bars3Icon, Bars3CenterLeftIcon, SunIcon, MoonIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid"
import { Sidebar } from "./sidebar"
import { PermissionsBootstrap } from "@client/components/permissions-bootstrap"
import { CommentNotificationsDropdown } from "@client/components/comment-notifications-dropdown"
import { NavUser } from "@client/components/layout/nav-user"
import { useTheme } from "@client/components/layout/theme-provider"
import { signOut, useSession } from "@client/lib/auth-client"
import { useSignOutOverlay } from "@client/components/signout-overlay"

const SIDEBAR_COLLAPSED_STORAGE_KEY = "techtool.sidebarCollapsed"

type PermissionsBootstrapPayload = {
  user: {
    id: string
    email: string
    name: string | null
    role: string | null
    image: string | null
    permissions: Array<{ resource: string; action: string }>
  } | null
  flags: {
    canViewProjects: boolean
    canCreateProjects: boolean
    canEditProjects: boolean
    canViewAssets: boolean
    canCreateAssets: boolean
    canEditAssets: boolean
    canDeleteAssets: boolean
    canManageAssets: boolean
    canViewClockify: boolean
    canManageClockify: boolean
    canViewTickets: boolean
    canCreateTickets: boolean
    canEditTickets: boolean
    canViewUsers: boolean
    canCreateUsers: boolean
    canEditUsers: boolean
    canDeleteUsers: boolean
    canViewRoles: boolean
    canCreateRoles: boolean
    canEditRoles: boolean
    canDeleteRoles: boolean
    canManageStatus: boolean
    canManageSettings: boolean
    canAccessSettings: boolean
  }
  ts: number
}

export function AppShell({
  children,
  permissionsBootstrap,
}: {
  children: React.ReactNode
  permissionsBootstrap?: PermissionsBootstrapPayload
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)
  const navigate = useNavigate()
  const { data: session } = useSession()
  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0
  const searchShortcutLabel = isMac ? "⌘K" : "Ctrl+K"

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"))
  }
  const { theme, setTheme } = useTheme()
  const { show: showOverlay, hide: hideOverlay } = useSignOutOverlay()

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)
      if (raw === "1") setDesktopSidebarCollapsed(true)
      if (raw === "0") setDesktopSidebarCollapsed(false)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, desktopSidebarCollapsed ? "1" : "0")
    } catch {
      // ignore
    }
  }, [desktopSidebarCollapsed])

  const handleSignOut = async () => {
    try {
      showOverlay()
      await signOut()
      navigate("/signin")
    } finally {
      hideOverlay()
    }
  }

  return (
    <div className="flex min-h-screen bg-muted text-foreground">
      {permissionsBootstrap ? <PermissionsBootstrap payload={permissionsBootstrap} /> : null}

      {/* Mobile sidebar + overlay */}
      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/70"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <Sidebar
            className="relative z-50 h-full w-64 shrink-0 bg-card shadow-xl"
            onNavigate={() => setMobileSidebarOpen(false)}
          />
        </div>
      ) : null}

      {/* Desktop sidebar */}
      {desktopSidebarCollapsed ? null : (
        <Sidebar
          onToggleCollapsed={() => setDesktopSidebarCollapsed(true)}
          className="sticky top-0 hidden h-screen w-60 shrink-0 md:block"
        />
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border bg-card">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              {desktopSidebarCollapsed ? (
                <button
                  type="button"
                  className="hidden items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring md:inline-flex"
                  aria-label="Expand navigation"
                  onClick={() => setDesktopSidebarCollapsed(false)}
                >
                  <span className="sr-only">Expand navigation</span>
                  <Bars3CenterLeftIcon className="h-5 w-5" />
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring md:hidden"
                aria-label="Open navigation"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <span className="sr-only">Open navigation</span>
                <Bars3Icon className="h-5 w-5" />
              </button>
              {/* Logo in header when sidebar collapsed (desktop) or always on mobile */}
              <div
                className={
                  desktopSidebarCollapsed
                    ? "flex items-center gap-2"
                    : "flex items-center gap-2 md:hidden"
                }
              >
                <img
                  src="/techtool-logo.png"
                  alt="Techtool logo"
                  className="h-6 w-6 rounded-sm object-contain"
                />
                <p className="text-sm font-semibold text-foreground">Techtool</p>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center px-4 md:max-w-md">
              <button
                type="button"
                onClick={openCommandPalette}
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Search commands (${searchShortcutLabel})`}
              >
                <MagnifyingGlassIcon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">Search…</span>
                <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium sm:inline-block">
                  {searchShortcutLabel}
                </kbd>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </button>
              <CommentNotificationsDropdown />
              <NavUser
                avatarOnly
                user={{
                  name: session?.user?.name || "User",
                  email: session?.user?.email || "",
                  avatar: session?.user?.image || "",
                }}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </header>
        <main className="min-h-0">
          <div className="px-4 py-4 sm:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
