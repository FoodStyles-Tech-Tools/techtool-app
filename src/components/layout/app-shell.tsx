import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Sidebar } from "./sidebar"
import { PermissionsBootstrap } from "@client/components/permissions-bootstrap"
import { CommentNotificationsDropdown } from "@client/components/comment-notifications-dropdown"
import { NavUser } from "@client/components/layout/nav-user"
import { signOut, useSession } from "@lib/auth-client"
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
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {permissionsBootstrap ? <PermissionsBootstrap payload={permissionsBootstrap} /> : null}

      {/* Mobile sidebar + overlay */}
      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <Sidebar
            className="relative z-50 h-full w-64 shrink-0 bg-white shadow-xl"
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
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              {desktopSidebarCollapsed ? (
                <button
                  type="button"
                  className="hidden items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 md:inline-flex"
                  aria-label="Expand navigation"
                  onClick={() => setDesktopSidebarCollapsed(false)}
                >
                  <span className="sr-only">Expand navigation</span>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 md:hidden"
                aria-label="Open navigation"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <span className="sr-only">Open navigation</span>
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              </button>
              <div className="block md:hidden">
                <p className="text-sm font-semibold text-slate-900">TECHTOOL</p>
                <p className="text-xs text-slate-500">Ticketing</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
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
