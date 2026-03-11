import { Navigate, Route, Routes } from "react-router-dom"
import { lazyComponent } from "@client/lib/lazy-component"
import {
  RouteLoadingFallback,
  ProtectedLayout,
  AuthCallbackPage,
  SettingsRedirectPage,
  NotFoundPage,
} from "@client/layouts"
import { SignInContent } from "@client/routes/signin/signin-content"
import { ProjectsPage } from "@client/routes/projects/projects-page"
import { ProjectDetailRoute } from "@client/routes/projects/project-detail-route"
import { AssetsPage } from "@client/routes/assets/assets-page"
import { UsersPage } from "@client/routes/admin/users/users-page"
import { RolesPage } from "@client/routes/admin/roles/roles-page"
import { TicketsPage } from "@client/features/tickets/components/tickets-page"
import { TicketDetailRoute } from "@client/features/tickets/components/ticket-detail-route"

const ClockifyClient = lazyComponent(
  () => import("@client/routes/clockify/clockify-client"),
  { loading: RouteLoadingFallback }
)

const GuildLeadReportClient = lazyComponent(
  () => import("@client/routes/report/guild-lead-report-client"),
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

const DeletedTicketsPanel = lazyComponent(
  () =>
    import("@client/components/settings/deleted-tickets-panel").then(
      (module) => module.DeletedTicketsPanel
    ),
  { loading: RouteLoadingFallback }
)

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
        <Route path="/clockify/sessions/:sessionId" element={<ClockifyClient />} />
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
