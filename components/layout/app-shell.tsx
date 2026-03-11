import { useNavigate } from "react-router-dom"
import { Sidebar } from "./sidebar"
import { PermissionsBootstrap } from "@/components/permissions-bootstrap"
import { CommentNotificationsDropdown } from "@/components/comment-notifications-dropdown"
import { NavUser } from "@/components/layout/nav-user"
import { signOut, useSession } from "@/lib/auth-client"
import { useSignOutOverlay } from "@/components/signout-overlay"

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
  const navigate = useNavigate()
  const { data: session } = useSession()
  const { show: showOverlay, hide: hideOverlay } = useSignOutOverlay()

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
      {permissionsBootstrap ? (
        <PermissionsBootstrap payload={permissionsBootstrap} />
      ) : null}
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex h-14 items-center justify-end gap-3 px-4 sm:px-6">
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
