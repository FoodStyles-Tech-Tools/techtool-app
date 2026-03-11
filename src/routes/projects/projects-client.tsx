"use client"

import { Link } from "react-router-dom"
import { useDeferredValue, useMemo, useState } from "react"
import { ProjectForm } from "@/components/forms/project-form"
import { usePermissions } from "@/hooks/use-permissions"
import { toast } from "@/components/ui/toast"
import { PageLayout } from "@/components/ui/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { FilterBar } from "@/components/ui/filter-bar"
import { EntityTableShell } from "@/components/ui/entity-table-shell"
import { DataState } from "@/components/ui/data-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormDialogShell } from "@/components/ui/form-dialog-shell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ROWS_PER_PAGE = 20

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
}

export default function ProjectsClient({
  initialProjects,
  initialDepartments,
  initialUsers,
}: ProjectsClientProps) {
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
  return (
    <PageLayout>
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
            type="button"
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

      <DataState
        isEmpty={filteredProjects.length === 0}
        emptyTitle="No projects found"
        emptyDescription="Try changing the current filters or create a project."
      >
        <EntityTableShell
          footer={
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Showing {filteredProjects.length === 0 ? 0 : startIndex + 1} to{" "}
                {Math.min(endIndex, filteredProjects.length)} of {filteredProjects.length} projects
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 py-2 text-xs">Project Name</TableHead>
                <TableHead className="h-9 py-2 text-xs">Project Owner</TableHead>
                <TableHead className="h-9 py-2 text-xs">Collaborators</TableHead>
                <TableHead className="h-9 py-2 text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProjects.map((project) => {
                const ownerLabel = project.owner?.name || project.owner?.email || "Unassigned"
                const collaboratorLabel =
                  project.collaborators.length > 0
                    ? project.collaborators
                        .map((collaborator) => collaborator.name || collaborator.email)
                        .join(", ")
                    : "-"
                return (
                  <TableRow key={project.id}>
                    <TableCell className="py-2">
                      <Link
                        to={`/projects/${project.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2 text-sm text-slate-700">{ownerLabel}</TableCell>
                    <TableCell className="py-2 text-sm text-slate-700">{collaboratorLabel}</TableCell>
                    <TableCell className="py-2 text-sm capitalize text-slate-700">{project.status}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </EntityTableShell>
      </DataState>

      <FormDialogShell
        open={isProjectFormOpen}
        onOpenChange={setProjectFormOpen}
        title="Create Project"
        description="Add a new project to organize ticket work."
        formId="create-project-form"
        submitLabel="Create"
        submitDisabled={false}
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
    </PageLayout>
  )
}
