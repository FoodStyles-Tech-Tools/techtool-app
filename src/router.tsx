import { createBrowserRouter, Navigate, Outlet } from "react-router-dom"
import { requestJson } from "@client/lib/api"
import { lazyComponent } from "@client/lib/lazy-component"
import {
  RouteLoadingFallback,
  ProtectedLayout,
  AuthCallbackPage,
  SettingsRedirectPage,
  NotFoundPage,
} from "@client/layouts"
import { AppProviders } from "@client/components/layout/app-providers"
import { SignInContent } from "@client/routes/signin/signin-content"
import { ProjectsPage } from "@client/routes/projects/projects-page"
import { ProjectDetailRoute } from "@client/routes/projects/project-detail-route"
import { AssetsPage } from "@client/routes/assets/assets-page"
import { UsersPage } from "@client/routes/admin/users/users-page"
import { RolesPage } from "@client/routes/admin/roles/roles-page"
import { AuditLogPage } from "@client/routes/audit-log/audit-log-page"
import { TicketsPage } from "@client/features/tickets/components/tickets-page"
import { TicketDetailRoute } from "@client/features/tickets/components/ticket-detail-route"
import { normalizeProject } from "@shared/types/project-mappers"
import type { ProjectDto } from "@shared/types/api/projects"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function ticketDetailLoader({
  params,
}: {
  params: { displayId?: string }
}) {
  const segment = params.displayId
  if (!segment) return { ticketId: null as string | null }
  try {
    if (UUID_REGEX.test(segment)) {
      const data = await requestJson<{ ticket: { id: string } }>(
        `/api/v2/tickets/${encodeURIComponent(segment)}?view=detail`
      )
      return { ticketId: data?.ticket?.id ?? null }
    }
    const data = await requestJson<{ ticket: { id: string } }>(
      `/api/tickets/by-display-id/${encodeURIComponent(segment)}`
    )
    return { ticketId: data.ticket?.id ?? null }
  } catch {
    return { ticketId: null as string | null }
  }
}

async function projectDetailLoader({
  params,
}: {
  params: { projectId?: string }
}) {
  const projectId = params.projectId
  if (!projectId) return { project: null }
  try {
    const response = await requestJson<{ project: ProjectDto }>(
      `/api/projects/${projectId}`
    )
    return { project: normalizeProject(response.project) }
  } catch {
    return { project: null }
  }
}

const ClockifyClient = lazyComponent(
  () => import("@client/routes/clockify/clockify-client"),
  { loading: RouteLoadingFallback }
)

const ReportSessionsListClient = lazyComponent(
  () => import("@client/routes/report/report-sessions-list-client"),
  { loading: RouteLoadingFallback }
)

const ReportSessionDetailClient = lazyComponent(
  () => import("@client/routes/report/report-session-detail-client"),
  { loading: RouteLoadingFallback }
)

const WorkspaceStatusPanel = lazyComponent(
  () =>
    import("@client/components/settings/workspace-status-panel").then(
      (module) => module.WorkspaceStatusPanel
    ),
  { loading: RouteLoadingFallback }
)

const WorkspaceEpicsPanel = lazyComponent(
  () =>
    import("@client/components/settings/workspace-epics-panel").then(
      (module) => module.WorkspaceEpicsPanel
    ),
  { loading: RouteLoadingFallback }
)

const WorkspaceSprintsPanel = lazyComponent(
  () =>
    import("@client/components/settings/workspace-sprints-panel").then(
      (module) => module.WorkspaceSprintsPanel
    ),
  { loading: RouteLoadingFallback }
)

export const router = createBrowserRouter([
  {
    element: (
      <AppProviders>
        <Outlet />
      </AppProviders>
    ),
    children: [
      { index: true, element: <Navigate to="/tickets" replace /> },
      { path: "signin", element: <SignInContent /> },
      { path: "auth/callback", element: <AuthCallbackPage /> },
      {
        element: <ProtectedLayout />,
        children: [
          { path: "dashboard", element: <Navigate to="/tickets" replace /> },
          { path: "tickets", element: <TicketsPage /> },
          {
            path: "tickets/:displayId",
            loader: ticketDetailLoader,
            element: <TicketDetailRoute />,
          },
          { path: "projects", element: <ProjectsPage /> },
          {
            path: "projects/:projectId",
            loader: projectDetailLoader,
            element: <ProjectDetailRoute />,
          },
          { path: "assets", element: <AssetsPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "roles", element: <RolesPage /> },
          { path: "audit-log", element: <AuditLogPage /> },
          { path: "status", element: <WorkspaceStatusPanel /> },
          { path: "epics", element: <WorkspaceEpicsPanel /> },
          { path: "sprints", element: <WorkspaceSprintsPanel /> },
          { path: "clockify", element: <ClockifyClient /> },
          { path: "clockify/sessions/:sessionId", element: <ClockifyClient /> },
          { path: "report", element: <ReportSessionsListClient /> },
          { path: "report/guild-lead-report", element: <ReportSessionsListClient /> },
          { path: "report/sessions/:sessionId", element: <ReportSessionDetailClient /> },
          { path: "settings", element: <SettingsRedirectPage /> },
          { path: "workspace", element: <Navigate to="/status" replace /> },
          { path: "workspace/status", element: <Navigate to="/status" replace /> },
          { path: "workspace/epic", element: <Navigate to="/epics" replace /> },
          { path: "workspace/sprint", element: <Navigate to="/sprints" replace /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
