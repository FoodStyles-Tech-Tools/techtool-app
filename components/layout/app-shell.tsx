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
    <div className="flex h-screen overflow-hidden bg-muted/40 dark:bg-[#13161b]">
      {permissionsBootstrap ? (
        <PermissionsBootstrap payload={permissionsBootstrap} />
      ) : null}
      <Sidebar />
      <div className="min-w-0 flex-1 bg-muted/40 p-2 dark:bg-[#13161b]">
        <main className="h-full min-w-0 overflow-y-auto rounded-2xl border bg-background shadow-sm dark:border-white/10 dark:bg-[#2f3339]">
          <div className="mx-auto w-full min-w-0 max-w-[1800px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
