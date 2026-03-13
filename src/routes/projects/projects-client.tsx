"use client"

import { Link } from "react-router-dom"
import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { PlusIcon, StarIcon } from "@heroicons/react/20/solid"
import { ProjectForm } from "@client/components/forms/project-form"
import { usePermissions } from "@client/hooks/use-permissions"
import { useUserPreferences } from "@client/hooks/use-user-preferences"
import { toast } from "@client/components/ui/toast"
import { PageLayout } from "@client/components/ui/page-layout"
import { PageHeader } from "@client/components/ui/page-header"
import { FilterBar } from "@client/components/ui/filter-bar"
import { FilterField } from "@client/components/ui/filter-field"
import { EntityTableShell } from "@client/components/ui/entity-table-shell"
import { DataState } from "@client/components/ui/data-state"
import { Button } from "@client/components/ui/button"
import { Input } from "@client/components/ui/input"
import { Select } from "@client/components/ui/select"
import { Checkbox } from "@client/components/ui/checkbox"
import { FormDialogShell } from "@client/components/ui/form-dialog-shell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table"
import { cn } from "@client/lib/utils"

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
  const { preferences, updatePreferences, isUpdating } = useUserPreferences()
  const currentUserId = currentUser?.id ?? null
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [requireSqaFilter, setRequireSqaFilter] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isProjectFormOpen, setProjectFormOpen] = useState(false)
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const pinnedIds = useMemo(
    () => (Array.isArray(preferences.pinned_project_ids) ? preferences.pinned_project_ids : []),
    [preferences.pinned_project_ids]
  )

  const togglePin = async (projectId: string) => {
    const isPinned = pinnedIds.includes(projectId)
    const next = isPinned
      ? pinnedIds.filter((id) => id !== projectId)
      : [...pinnedIds, projectId]
    try {
      await updatePreferences({ pinned_project_ids: next })
      toast(isPinned ? "Project unpinned" : "Project pinned")
    } catch {
      toast("Failed to update pin")
    }
  }

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

        if (assigneeFilter !== "all") {
          const isOwner = project.owner?.id === assigneeFilter
          const isRequester = project.requesters.some((r) => r.id === assigneeFilter)
          const isCollaborator = project.collaborators.some((c) => c.id === assigneeFilter)
          if (!isOwner && !isRequester && !isCollaborator) return false
        }

        if (requireSqaFilter && !project.require_sqa) return false

        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  }, [currentUser?.id, deferredSearchQuery, initialProjects, assigneeFilter, statusFilter, requireSqaFilter])

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ROWS_PER_PAGE))
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex)
  const canCreateProjects = flags?.canCreateProjects ?? false
  return (
    <PageLayout>
      <PageHeader title="Projects" />

      <FilterBar
        hasActiveFilters={
          searchQuery.trim() !== "" ||
          statusFilter !== "active" ||
          assigneeFilter !== "all" ||
          requireSqaFilter
        }
        onResetFilters={() => {
          setSearchQuery("")
          setStatusFilter("active")
          setAssigneeFilter("all")
          setRequireSqaFilter(false)
          setCurrentPage(1)
        }}
        filters={
          <>
            <FilterField label="Search" id="projects-search">
              <div className="w-full min-w-[200px] md:w-72">
                <Input
                  id="projects-search"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
            </FilterField>
            <FilterField label="Status" id="projects-status">
              <Select
                id="projects-status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as "active" | "all")
                  setCurrentPage(1)
                }}
                className="min-w-[120px]"
              >
                <option value="active">Active only</option>
                <option value="all">All</option>
              </Select>
            </FilterField>
            <FilterField label="Assignee" id="projects-assignee">
              <Select
                id="projects-assignee"
                value={assigneeFilter}
                onChange={(event) => {
                  setAssigneeFilter(event.target.value)
                  setCurrentPage(1)
                }}
                className="min-w-[140px]"
              >
                <option value="all">All</option>
                {currentUserId ? (
                  <option value={currentUserId}>Assigned to me</option>
                ) : null}
                {users
                  .filter((u) => u.id !== currentUserId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
              </Select>
            </FilterField>
            <FilterField label="" id="projects-require-sqa">
              <Checkbox
                id="projects-require-sqa"
                label="Require SQA"
                checked={requireSqaFilter}
                onChange={(event) => {
                  setRequireSqaFilter(event.target.checked)
                  setCurrentPage(1)
                }}
              />
            </FilterField>
          </>
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
              <div className="text-sm text-muted-foreground">
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
                <span className="text-sm text-muted-foreground">
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
                <TableHead className="h-9 w-9 py-2" aria-label="Pin" />
                <TableHead className="h-9 py-2">Project Name</TableHead>
                <TableHead className="h-9 py-2">Project Owner</TableHead>
                <TableHead className="h-9 py-2">Collaborators</TableHead>
                <TableHead className="h-9 py-2">Require SQA</TableHead>
                <TableHead className="h-9 py-2">Status</TableHead>
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
                const isPinned = pinnedIds.includes(project.id)
                return (
                  <TableRow key={project.id}>
                    <TableCell className="w-9 py-2">
                      <button
                        type="button"
                        onClick={() => togglePin(project.id)}
                        disabled={isUpdating}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50",
                          isPinned && "text-yellow-500"
                        )}
                        title={isPinned ? "Unpin project" : "Pin project"}
                        aria-label={isPinned ? "Unpin project" : "Pin project"}
                      >
                        <StarIcon className="h-4 w-4" />
                      </button>
                    </TableCell>
                    <TableCell className="py-2">
                      <Link
                        to={`/projects/${project.id}`}
                        className="font-normal text-primary underline"
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2 text-sm text-foreground">{ownerLabel}</TableCell>
                    <TableCell className="py-2 text-sm text-foreground">{collaboratorLabel}</TableCell>
                  <TableCell className="py-2">
                    <input
                      type="checkbox"
                      checked={project.require_sqa}
                      readOnly
                      disabled
                      className="h-4 w-4 cursor-not-allowed rounded border-input opacity-70"
                      aria-label="Require SQA"
                    />
                  </TableCell>
                    <TableCell className="py-2 text-sm capitalize text-foreground">{project.status}</TableCell>
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
