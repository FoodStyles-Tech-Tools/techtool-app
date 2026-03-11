import { Navigate, Outlet, Route, Routes, useLocation, useParams, useSearchParams } from "react-router-dom"
import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { AppShell } from "@/components/layout/app-shell"
import { useSession } from "@/lib/auth-client"
import { requestJson } from "@/lib/client/api"
import { SignInContent } from "@/app/(public)/signin/signin-content"
import TicketsClient from "@/features/tickets/components/tickets-client"
import { TicketDetailPageClient } from "@/features/tickets/components/ticket-detail-page-client"
import ProjectsClient from "@/app/(app)/(dashboard)/projects/projects-client"
import ProjectDetailClient from "@/app/(app)/(dashboard)/projects/[projectId]/project-detail-client"
import AssetsClient from "@/app/(app)/(dashboard)/assets/assets-client"
import UsersClient from "@/app/(app)/(admin)/users/users-client"
import RolesClient from "@/app/(app)/(admin)/roles/roles-client"
import ClockifyClient from "@/app/(app)/(dashboard)/clockify/clockify-client"
import GuildLeadReportClient from "@/app/(app)/(dashboard)/report/guild-lead-report-client"
import { WorkspaceStatusPanel } from "@/components/settings/workspace-status-panel"
import { WorkspaceEpicsPanel } from "@/components/settings/workspace-epics-panel"
import { WorkspaceSprintsPanel } from "@/components/settings/workspace-sprints-panel"
import { DeletedTicketsPanel } from "@/components/settings/deleted-tickets-panel"
import { useAssets } from "@/hooks/use-assets"
import { useDepartments } from "@/hooks/use-departments"
import { usePermissions } from "@/hooks/use-permissions"
import { useProjects } from "@/hooks/use-projects"
import { useUsers } from "@/hooks/use-users"

type RoleRecord = {
  id: string
  name: string
  description: string | null
  is_system: boolean
  permissions: Array<{ id?: string; resource: string; action: string }>
  created_at: string
}

function FullScreenMessage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function getBackendAppUrl() {
  return import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || "http://localhost:4000"
}

function AuthCallbackPage() {
  const location = useLocation()

  useEffect(() => {
    const currentUrl = new URL(window.location.href)
    const backendCallbackUrl = new URL("/auth/callback", getBackendAppUrl())
    backendCallbackUrl.search = location.search

    if (currentUrl.origin === backendCallbackUrl.origin) {
      return
    }

    window.location.replace(backendCallbackUrl.toString())
  }, [location.search])

  return (
    <FullScreenMessage
      title="Completing sign-in"
      description="Finishing the authentication flow and redirecting you back into the app."
    />
  )
}

function ProtectedLayout() {
  const location = useLocation()
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <FullScreenMessage
        title="Loading workspace"
        description="Checking your session and preparing the app shell."
      />
    )
  }

  if (!session) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/signin?next=${next}`} replace />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function SettingsRedirectPage() {
  const { flags, loading } = usePermissions()

  if (loading) {
    return (
      <FullScreenMessage
        title="Loading settings"
        description="Resolving the right section for your permissions."
      />
    )
  }

  if (flags.canViewUsers) return <Navigate to="/users" replace />
  if (flags.canViewRoles) return <Navigate to="/roles" replace />
  if (flags.canManageStatus) return <Navigate to="/status" replace />
  if (flags.canEditProjects) return <Navigate to="/epics" replace />
  if (flags.canViewTickets) return <Navigate to="/deleted-tickets" replace />
  if (flags.canViewAssets) return <Navigate to="/assets" replace />
  if (flags.canViewClockify) return <Navigate to="/clockify" replace />
  return <Navigate to="/tickets" replace />
}

function TicketsPage() {
  const [searchParams] = useSearchParams()
  return <TicketsClient initialProjectId={searchParams.get("projectId")} />
}

function TicketDetailRoute() {
  const { displayId } = useParams()
  const ticketLookup = useQuery({
    queryKey: ["ticket-display-id", displayId],
    enabled: !!displayId,
    queryFn: async () => {
      const response = await requestJson<{ ticket: { id: string } }>(
        `/api/tickets/by-display-id/${encodeURIComponent(displayId || "")}`
      )
      return response.ticket
    },
  })

  if (ticketLookup.isLoading) {
    return (
      <FullScreenMessage
        title="Loading ticket"
        description="Resolving the ticket identifier and fetching details."
      />
    )
  }

  if (!ticketLookup.data?.id) {
    return (
      <FullScreenMessage
        title="Ticket not found"
        description="The requested ticket could not be resolved."
      />
    )
  }

  return <TicketDetailPageClient ticketId={ticketLookup.data.id} />
}

function ProjectsPage() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects({ realtime: false })
  const { departments, loading: departmentsLoading } = useDepartments({ realtime: false })
  const { data: users = [], isLoading: usersLoading } = useUsers({ realtime: false })

  const ticketStats = useMemo(
    () =>
      projects.reduce<Record<string, { total: number; done: number; percentage: number }>>(
        (accumulator, project) => {
          const stats = project.ticket_stats || { total: 0, open: 0, done: 0 }
          accumulator[project.id] = {
            total: stats.total,
            done: stats.done,
            percentage: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0,
          }
          return accumulator
        },
        {}
      ),
    [projects]
  )

  if (projectsLoading || departmentsLoading || usersLoading) {
    return (
      <FullScreenMessage
        title="Loading projects"
        description="Fetching projects, departments, and people."
      />
    )
  }

  return (
    <ProjectsClient
      initialProjects={projects}
      initialDepartments={departments}
      initialUsers={users}
      initialTicketStats={ticketStats}
    />
  )
}

function AssetsPage() {
  const { data: assets = [], isLoading: assetsLoading } = useAssets()
  const { data: users = [], isLoading: usersLoading } = useUsers({ realtime: false })

  if (assetsLoading || usersLoading) {
    return (
      <FullScreenMessage
        title="Loading assets"
        description="Fetching the shared asset registry."
      />
    )
  }

  return <AssetsClient initialAssets={assets} users={users} />
}

function UsersPage() {
  const { data: users = [], isLoading: usersLoading } = useUsers({ realtime: false })
  const rolesQuery = useQuery({
    queryKey: ["roles", "select"],
    queryFn: async () => {
      const response = await requestJson<{ roles: Array<{ id: string; name: string }> }>("/api/roles")
      return response.roles
    },
  })

  if (usersLoading || rolesQuery.isLoading) {
    return (
      <FullScreenMessage
        title="Loading users"
        description="Fetching users and available roles."
      />
    )
  }

  return <UsersClient initialUsers={users} roles={rolesQuery.data || []} />
}

function RolesPage() {
  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await requestJson<{ roles: RoleRecord[] }>("/api/roles")
      return response.roles
    },
  })

  if (rolesQuery.isLoading) {
    return (
      <FullScreenMessage
        title="Loading roles"
        description="Fetching role definitions and permission sets."
      />
    )
  }

  return <RolesClient initialRoles={rolesQuery.data || []} />
}

function ProjectDetailRoute() {
  const { projectId } = useParams()

  if (!projectId) {
    return (
      <FullScreenMessage
        title="Project not found"
        description="The requested project identifier is missing."
      />
    )
  }

  return <ProjectDetailClient projectId={projectId} />
}

function NotFoundPage() {
  return (
    <FullScreenMessage
      title="Page not found"
      description="The requested route does not exist in the Vite frontend."
    />
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tickets" replace />} />
      <Route path="/signin" element={<SignInContent />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Navigate to="/tickets" replace />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:displayId" element={<TicketDetailRoute />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailRoute />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/status" element={<WorkspaceStatusPanel />} />
        <Route path="/epics" element={<WorkspaceEpicsPanel />} />
        <Route path="/sprints" element={<WorkspaceSprintsPanel />} />
        <Route path="/deleted-tickets" element={<DeletedTicketsPanel />} />
        <Route path="/clockify" element={<ClockifyClient />} />
        <Route path="/report" element={<GuildLeadReportClient />} />
        <Route path="/report/guild-lead-report" element={<GuildLeadReportClient />} />
        <Route path="/settings" element={<SettingsRedirectPage />} />
        <Route path="/workspace" element={<Navigate to="/status" replace />} />
        <Route path="/workspace/status" element={<Navigate to="/status" replace />} />
        <Route path="/workspace/epic" element={<Navigate to="/epics" replace />} />
        <Route path="/workspace/sprint" element={<Navigate to="/sprints" replace />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
