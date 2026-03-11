"use client"

import { Link, useNavigate } from "react-router-dom"
import { useMemo, useState } from "react"
import { useProject } from "@/hooks/use-projects"
import { useDepartments } from "@/hooks/use-departments"
import { useUsers } from "@/hooks/use-users"
import { usePermissions } from "@/hooks/use-permissions"
import { PageHeader } from "@/components/ui/page-header"
import { PageLayout } from "@/components/ui/page-layout"
import { EntityPageLayout } from "@/components/ui/entity-page-layout"
import { DataState } from "@/components/ui/data-state"
import { ContentCard } from "@/components/ui/content-card"
import { Button } from "@/components/ui/button"
import { FormDialogShell } from "@/components/ui/form-dialog-shell"
import { ProjectForm } from "@/components/forms/project-form"
import { toast } from "@/components/ui/toast"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const navigate = useNavigate()
  const { flags } = usePermissions()
  const { data, isLoading } = useProject(projectId)
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
          actions={
            <>
              <Button variant="outline" onClick={() => navigate("/projects")}>
                Back to Projects
              </Button>
              <Button asChild>
                <Link href={`/tickets?projectId=${projectId}`}>
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
              <ContentCard className="p-5 shadow-none">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Status</p>
                    <p className="mt-1 text-sm capitalize text-slate-900">{project.status}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Lead</p>
                    <p className="mt-1 text-sm text-slate-900">{ownerLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Open Tickets</p>
                    <p className="mt-1 text-sm text-slate-900">{ticketStats.open}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Department</p>
                    <p className="mt-1 text-sm text-slate-900">{project.department?.name || "No department"}</p>
                  </div>
                </div>
              </ContentCard>

              <ContentCard className="p-5 shadow-none">
                <h2 className="text-sm font-semibold text-slate-900">Overview</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {project.description || "No project description provided."}
                </p>
              </ContentCard>

              <ContentCard className="p-5 shadow-none">
                <h2 className="text-sm font-semibold text-slate-900">People</h2>
                <dl className="mt-3 space-y-4 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Owner</dt>
                    <dd className="mt-1 text-slate-900">{ownerLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Requesters</dt>
                    <dd className="mt-1 text-slate-900">{requestersLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Collaborators</dt>
                    <dd className="mt-1 text-slate-900">{collaboratorsLabel}</dd>
                  </div>
                </dl>
              </ContentCard>
            </div>

            <div className="space-y-4">
              <ContentCard className="p-5 shadow-none">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Ticket Queue</h2>
                    <p className="text-sm text-slate-500">Use the project queue for day-to-day ticket work.</p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/tickets?projectId=${projectId}`}>Open Queue</Link>
                  </Button>
                </div>
                <dl className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Open</dt>
                    <dd className="mt-1 text-sm text-slate-900">{ticketStats.open}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Done</dt>
                    <dd className="mt-1 text-sm text-slate-900">{ticketStats.done}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Total</dt>
                    <dd className="mt-1 text-sm text-slate-900">{ticketStats.total}</dd>
                  </div>
                </dl>
              </ContentCard>

              <ContentCard className="p-5 shadow-none">
                <h2 className="text-sm font-semibold text-slate-900">Details</h2>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Status</dt>
                    <dd className="mt-1 capitalize text-slate-900">{project.status}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Require SQA</dt>
                    <dd className="mt-1 text-slate-900">{project.require_sqa ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Department</dt>
                    <dd className="mt-1 text-slate-900">{project.department?.name || "No department"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-500">Created</dt>
                    <dd className="mt-1 text-slate-900">{formatDate(project.created_at)}</dd>
                  </div>
                </dl>
              </ContentCard>

              <ContentCard className="p-5 shadow-none">
                <h2 className="text-sm font-semibold text-slate-900">Links</h2>
                <div className="mt-3 space-y-2">
                  {project.links?.length ? (
                    project.links.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-slate-900 hover:underline"
                      >
                        <span className="truncate">{url}</span>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Open</span>
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No links added.</p>
                  )}
                </div>
              </ContentCard>
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
