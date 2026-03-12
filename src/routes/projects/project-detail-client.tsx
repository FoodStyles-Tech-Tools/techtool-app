"use client"

import { Link } from "react-router-dom"
import { useMemo, useState } from "react"
import { useProject } from "@client/hooks/use-projects"
import { useDepartments } from "@client/hooks/use-departments"
import { useUsers } from "@client/hooks/use-users"
import { usePermissions } from "@client/hooks/use-permissions"
import { PageHeader } from "@client/components/ui/page-header"
import { Breadcrumb } from "@client/components/ui/breadcrumb"
import { PageLayout } from "@client/components/ui/page-layout"
import { EntityPageLayout } from "@client/components/ui/entity-page-layout"
import { DataState } from "@client/components/ui/data-state"
import { Card } from "@client/components/ui/card"
import { Button } from "@client/components/ui/button"
import { FormDialogShell } from "@client/components/ui/form-dialog-shell"
import { ProjectForm } from "@client/components/forms/project-form"
import { toast } from "@client/components/ui/toast"
import type { Project } from "@shared/types"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

type ProjectDetailClientProps = {
  projectId: string
  initialProject?: { project: Project }
}

export default function ProjectDetailClient({
  projectId,
  initialProject,
}: ProjectDetailClientProps) {
  const { flags } = usePermissions()
  const { data, isLoading } = useProject(projectId, {
    initialData: initialProject,
  })
  const { departments } = useDepartments()
  const { data: usersData } = useUsers()
  const [isEditOpen, setEditOpen] = useState(false)

  const project = data?.project
  const users = useMemo(() => usersData || [], [usersData])
  const ticketStats = project?.ticket_stats || {
    total: project?.tickets?.[0]?.count || 0,
    open: project?.tickets?.[0]?.count || 0,
    done: 0,
  }
  const canEditProjects = flags?.canEditProjects ?? false
  const ownerLabel = project?.owner?.name || project?.owner?.email || "Unassigned"
  const requestersLabel = project?.requesters?.length
    ? project.requesters.map((person) => person.name || person.email).join(", ")
    : "No requesters"
  const collaboratorsLabel = project?.collaborators?.length
    ? project.collaborators.map((person) => person.name || person.email).join(", ")
    : "No collaborators"

  return (
    <PageLayout>
      <EntityPageLayout
        header={
          <PageHeader
          title={project?.name || "Project"}
          description={project?.description || "Use this project page to understand scope, ownership, and jump into related tickets."}
          breadcrumb={
            <Breadcrumb
              items={[
                { label: "Projects", href: "/projects" },
                { label: project?.name || "Project" },
              ]}
            />
          }
          actions={
            <>
              <Button asChild>
                <Link to={`/tickets?projectId=${projectId}`}>
                  Open Tickets
                </Link>
              </Button>
              {canEditProjects ? (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  Edit Project
                </Button>
              ) : null}
            </>
          }
        />
      }
    >
      <DataState
        loading={isLoading}
        isEmpty={!isLoading && !project}
        loadingTitle="Loading project"
        loadingDescription="Project details are being prepared."
        emptyTitle="Project not found"
        emptyDescription="The requested project could not be loaded."
      >
        {project ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,360px)]">
            <div className="space-y-4">
              <Card className="p-5 shadow-none">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
                    <p className="mt-1 text-sm capitalize text-foreground">{project.status}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Lead</p>
                    <p className="mt-1 text-sm text-foreground">{ownerLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Open Tickets</p>
                    <p className="mt-1 text-sm text-foreground">{ticketStats.open}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Department</p>
                    <p className="mt-1 text-sm text-foreground">{project.department?.name || "No department"}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 shadow-none">
                <h2 className="text-sm font-semibold text-foreground">Overview</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {project.description || "No project description provided."}
                </p>
              </Card>

              <Card className="p-5 shadow-none">
                <h2 className="text-sm font-semibold text-foreground">People</h2>
                <dl className="mt-3 space-y-4 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Owner</dt>
                    <dd className="mt-1 text-foreground">{ownerLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Requesters</dt>
                    <dd className="mt-1 text-foreground">{requestersLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Collaborators</dt>
                    <dd className="mt-1 text-foreground">{collaboratorsLabel}</dd>
                  </div>
                </dl>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="p-5 shadow-none">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Ticket Queue</h2>
                    <p className="text-sm text-muted-foreground">Use the project queue for day-to-day ticket work.</p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/tickets?projectId=${projectId}`}>Open Queue</Link>
                  </Button>
                </div>
                <dl className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Open</dt>
                    <dd className="mt-1 text-sm text-foreground">{ticketStats.open}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Done</dt>
                    <dd className="mt-1 text-sm text-foreground">{ticketStats.done}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Total</dt>
                    <dd className="mt-1 text-sm text-foreground">{ticketStats.total}</dd>
                  </div>
                </dl>
              </Card>

              <Card className="p-5 shadow-none">
                <h2 className="text-sm font-semibold text-foreground">Details</h2>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Status</dt>
                    <dd className="mt-1 capitalize text-foreground">{project.status}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Require SQA</dt>
                    <dd className="mt-1 text-foreground">{project.require_sqa ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Department</dt>
                    <dd className="mt-1 text-foreground">{project.department?.name || "No department"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Created</dt>
                    <dd className="mt-1 text-foreground">{formatDate(project.created_at)}</dd>
                  </div>
                </dl>
              </Card>

              <Card className="p-5 shadow-none">
                <h2 className="text-sm font-semibold text-foreground">Links</h2>
                <div className="mt-3 space-y-2">
                  {project.links?.length ? (
                    project.links.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-foreground hover:underline"
                      >
                        <span className="truncate">{url}</span>
                        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open</span>
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No links added.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </DataState>

      <FormDialogShell
        open={isEditOpen}
        onOpenChange={setEditOpen}
        title="Edit Project"
        formId="project-detail-edit-form"
        submitLabel="Save"
      >
        {project ? (
          <ProjectForm
            formId="project-detail-edit-form"
            hideSubmitButton
            departments={departments}
            users={users}
            initialData={{
              id: project.id,
              name: project.name,
              description: project.description || "",
              status: project.status as "active" | "inactive",
              require_sqa: project.require_sqa,
              department_id: project.department?.id,
              links: project.links || [],
              requester_ids: project.requester_ids || project.requesters.map((item) => item.id),
              collaborator_ids: project.collaborator_ids || project.collaborators.map((item) => item.id),
            }}
            onSuccess={() => {
              setEditOpen(false)
              toast("Project updated")
              window.location.reload()
            }}
          />
        ) : null}
      </FormDialogShell>
      </EntityPageLayout>
    </PageLayout>
  )
}
