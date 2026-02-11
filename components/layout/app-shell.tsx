import { Sidebar } from "./sidebar"
import { PermissionsBootstrap } from "@/components/permissions-bootstrap"

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
    <div className="flex h-screen overflow-hidden">
      {permissionsBootstrap ? (
        <PermissionsBootstrap payload={permissionsBootstrap} />
      ) : null}
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="w-full px-4 py-4">{children}</div>
      </main>
    </div>
  )
}

