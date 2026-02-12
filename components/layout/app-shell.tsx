import { Sidebar } from "./sidebar"
import { PermissionsBootstrap } from "@/components/permissions-bootstrap"
import { AppShellHeader } from "./app-shell-header"

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
  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      {permissionsBootstrap ? (
        <PermissionsBootstrap payload={permissionsBootstrap} />
      ) : null}
      <Sidebar />
      <div className="min-w-0 flex-1 bg-muted/40 p-2">
        <main className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
          <AppShellHeader />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full min-w-0 max-w-[1800px] px-4 pb-5 pt-0 sm:px-6 sm:pb-6 lg:px-8 xl:px-10">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
