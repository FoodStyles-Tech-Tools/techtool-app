"use client"

import { Link, useNavigate } from "react-router-dom"
import { useDeferredValue, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { EntityPageLayout } from "@/components/ui/entity-page-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataState } from "@/components/ui/data-state"
import { FormDialogShell } from "@/components/ui/form-dialog-shell"
import { ContentCard } from "@/components/ui/content-card"
import { ProjectForm } from "@/components/forms/project-form"
import { usePermissions } from "@/hooks/use-permissions"
import { toast } from "@/components/ui/toast"

const ROWS_PER_PAGE = 20

type ProjectTicketStats = { total: number; done: number; percentage: number }
type Department = { id: string; name: string }
type BasicUser = {
  id: string
  name: string | null
  email: string
  image: string | null
  role?: string | null
}
type ProjectRowData = {
  id: string
  name: string
  description: string | null
  status: "active" | "inactive"
  require_sqa: boolean
  created_at: string
  department: Department | null
  owner?: BasicUser | null
  requesters: BasicUser[]
  requester_ids?: string[]
  collaborators: BasicUser[]
  collaborator_ids?: string[]
  links?: string[] | null
}

type ProjectsClientProps = {
  initialProjects: ProjectRowData[]
  initialDepartments: Department[]
  initialUsers: BasicUser[]
  initialTicketStats: Record<string, ProjectTicketStats>
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function getProjectPeopleCount(project: ProjectRowData) {
  const people = new Set<string>()
  if (project.owner?.id) people.add(project.owner.id)
  project.requesters.forEach((requester) => people.add(requester.id))
  project.collaborators.forEach((collaborator) => people.add(collaborator.id))
  return people.size
}

export default function ProjectsClient({
  initialProjects,
  initialDepartments,
  initialUsers,
  initialTicketStats,
}: ProjectsClientProps) {
  const navigate = useNavigate()
  const { flags, user: currentUser } = usePermissions()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active")
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isProjectFormOpen, setProjectFormOpen] = useState(false)
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const users = useMemo(
    () =>
      (initialUsers || []).filter((user) =>
        user.role ? ["admin", "member"].includes(user.role.toLowerCase()) : false
      ),
    [initialUsers]
  )

  const filteredProjects = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase()
    const currentUserId = currentUser?.id

    return initialProjects
      .filter((project) => {
        if (statusFilter === "active" && project.status !== "active") return false
        if (
          normalizedQuery &&
          !project.name.toLowerCase().includes(normalizedQuery) &&
          !project.description?.toLowerCase().includes(normalizedQuery)
        ) {
          return false
        }

        if (assignedToMeOnly && currentUserId) {
          const isOwner = project.owner?.id === currentUserId
          const isRequester = project.requesters.some((requester) => requester.id === currentUserId)
          const isCollaborator = project.collaborators.some((collaborator) => collaborator.id === currentUserId)
          if (!isOwner && !isRequester && !isCollaborator) return false
        }

        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  }, [currentUser?.id, deferredSearchQuery, initialProjects, assignedToMeOnly, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ROWS_PER_PAGE))
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex)
  const canCreateProjects = flags?.canCreateProjects ?? false
  const summary = useMemo(() => {
    return filteredProjects.reduce(
      (totals, project) => {
        const stats = initialTicketStats[project.id] || { total: 0, done: 0, percentage: 0 }
        totals.projects += 1
        totals.openTickets += Math.max(0, stats.total - stats.done)
        if (project.require_sqa) totals.requireSqa += 1
        return totals
      },
      { projects: 0, openTickets: 0, requireSqa: 0 }
    )
  }, [filteredProjects, initialTicketStats])

  return (
    <EntityPageLayout
      header={
        <PageHeader
          title="Projects"
          description="Projects organize ticket work. Open a project to review ownership and jump into its queue."
          actions={
            canCreateProjects ? (
              <Button type="button" onClick={() => setProjectFormOpen(true)}>
                Create Project
              </Button>
            ) : null
          }
        />
      }
      toolbar={
        <FilterBar
          filters={
            <>
              <div className="w-full min-w-[220px] md:w-72">
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as "active" | "all")
                  setCurrentPage(1)
                }}
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              >
                <option value="active">Active only</option>
                <option value="all">All projects</option>
              </select>
              <label className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={assignedToMeOnly}
                  onChange={(event) => {
                    setAssignedToMeOnly(event.target.checked)
                    setCurrentPage(1)
                  }}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Assigned to me
              </label>
            </>
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3"
              onClick={() => {
                setSearchQuery("")
                setStatusFilter("active")
                setAssignedToMeOnly(false)
                setCurrentPage(1)
              }}
            >
              Reset
            </Button>
          }
        />
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <ContentCard className="p-4 shadow-none">
            <p className="text-xs font-medium uppercase text-slate-500">Projects</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.projects}</p>
          </ContentCard>
          <ContentCard className="p-4 shadow-none">
            <p className="text-xs font-medium uppercase text-slate-500">Open Tickets</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.openTickets}</p>
          </ContentCard>
          <ContentCard className="p-4 shadow-none">
            <p className="text-xs font-medium uppercase text-slate-500">Require SQA</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.requireSqa}</p>
          </ContentCard>
        </div>

        <DataState
          isEmpty={filteredProjects.length === 0}
          emptyTitle="No projects found"
          emptyDescription="Try changing the current filters or create a project."
        >
          <ContentCard className="overflow-hidden shadow-none">
            <div className="divide-y divide-slate-200">
              {paginatedProjects.map((project) => {
                const stats = initialTicketStats[project.id] || { total: 0, done: 0, percentage: 0 }
                const openTickets = Math.max(0, stats.total - stats.done)
                const ownerLabel = project.owner?.name || project.owner?.email || "Unassigned"
                const departmentLabel = project.department?.name || "No department"

                return (
                  <div key={project.id} className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/projects/${project.id}`}
                            className="text-sm font-medium text-slate-900 hover:underline"
                          >
                            {project.name}
                          </Link>
                          <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs capitalize text-slate-600">
                            {project.status}
                          </span>
                          {project.require_sqa ? (
                            <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                              SQA required
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-600">
                          {project.description || "No project description provided."}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>Lead {ownerLabel}</span>
                          <span>Department {departmentLabel}</span>
                          <span>Created {formatDate(project.created_at)}</span>
                        </div>
                      </div>

                      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:min-w-[360px]">
                        <div>
                          <dt className="text-xs uppercase text-slate-500">Open tickets</dt>
                          <dd className="mt-1 font-medium text-slate-900">{openTickets}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase text-slate-500">Done</dt>
                          <dd className="mt-1 font-medium text-slate-900">{stats.done}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase text-slate-500">People</dt>
                          <dd className="mt-1 font-medium text-slate-900">{getProjectPeopleCount(project)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <div className="text-sm text-slate-500">
                Showing {filteredProjects.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredProjects.length)} of {filteredProjects.length} projects
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-500">Page {currentPage} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </ContentCard>
        </DataState>
      </div>

      <FormDialogShell
        open={isProjectFormOpen}
        onOpenChange={setProjectFormOpen}
        title="Create Project"
        formId="create-project-form"
        submitLabel="Create"
      >
        <ProjectForm
          departments={initialDepartments}
          users={users}
          formId="create-project-form"
          hideSubmitButton
          onSuccess={() => {
            setProjectFormOpen(false)
            toast("Project created")
            window.location.reload()
          }}
        />
      </FormDialogShell>
    </EntityPageLayout>
  )
}


