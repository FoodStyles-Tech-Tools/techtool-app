"use client"

import { useState, useMemo, useEffect, useCallback, memo, useDeferredValue } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { useUpdateProject } from "@/hooks/use-projects"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import {
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { Plus, Circle, Search } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { cn, truncateText } from "@/lib/utils"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProjectForm } from "@/components/forms/project-form"

const ROWS_PER_PAGE = 20
type ProjectTicketStats = { total: number; done: number; percentage: number }
const DEFAULT_PROJECT_STATS = { total: 0, done: 0, percentage: 0 }
const toolbarInputClassName =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500"
const toolbarToggleClassName =
  "flex min-h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"

interface Department {
  id: string
  name: string
}

interface BasicUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role?: string | null
}

interface ProjectRowData {
  id: string
  name: string
  description: string | null
  status: "active" | "inactive"
  require_sqa: boolean
  links?: string[] | null
  created_at: string
  department: Department | null
  owner?: BasicUser | null
  requesters: BasicUser[]
  requester_ids?: string[]
  collaborators: BasicUser[]
  collaborator_ids?: string[]
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
      return <Circle className="h-3 w-3 fill-green-500 text-green-500" />
    case "inactive":
      return <Circle className="h-3 w-3 fill-red-500 text-red-500" />
    default:
      return null
  }
}

const formatLinkLabel = (url: string) => {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

type ProjectsClientProps = {
  initialProjects: ProjectRowData[]
  initialDepartments: Department[]
  initialUsers: BasicUser[]
  initialTicketStats: Record<string, ProjectTicketStats>
}

export default function ProjectsClient({
  initialProjects,
  initialDepartments,
  initialUsers,
  initialTicketStats,
}: ProjectsClientProps) {
  const router = useRouter()
  // All hooks must be called before any conditional returns
  const { flags, user: currentUser } = usePermissions()
  const updateProject = useUpdateProject()
  const { preferences, updatePreferences, isUpdating: isUpdatingPreferences } = useUserPreferences()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [excludeDone, setExcludeDone] = useState(true)
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false)
  const [isProjectFormOpen, setProjectFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectRowData | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [updatingFields, setUpdatingFields] = useState<Record<string, string>>({})
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const [projects, setProjects] = useState<ProjectRowData[]>(initialProjects)
  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  const [projectTicketStats, setProjectTicketStats] = useState<Record<string, ProjectTicketStats>>(
    initialTicketStats || {}
  )
  useEffect(() => {
    setProjectTicketStats(initialTicketStats || {})
  }, [initialTicketStats])

  const departments = useMemo(() => initialDepartments, [initialDepartments])
  const users = useMemo(
    () =>
      (initialUsers || []).filter((user) =>
        user.role ? ["admin", "member"].includes(user.role.toLowerCase()) : false
      ),
    [initialUsers]
  )
  const loading = false
  const canCreateProjects = flags?.canCreateProjects ?? false
  const canEditProjects = flags?.canEditProjects ?? false
  const pinnedProjectIds = useMemo(
    () => preferences.pinned_project_ids ?? [],
    [preferences.pinned_project_ids]
  )
  const pinnedProjectIdSet = useMemo(() => new Set(pinnedProjectIds), [pinnedProjectIds])

  // Calculate ticket stats per project
  const projectStats = projectTicketStats

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearchQuery, departmentFilter, excludeDone, assignedToMeOnly])

  const currentUserId = currentUser?.id
  const isSqaUser = currentUser?.role?.toLowerCase() === "sqa"

  const filteredProjects = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase()
    const filtered = projects.filter((project) => {
      if (isSqaUser && !project.require_sqa) return false

      // Search filter
      const matchesSearch = 
        !normalizedQuery ||
        project.name.toLowerCase().includes(normalizedQuery) ||
        project.description?.toLowerCase().includes(normalizedQuery)
      
      if (!matchesSearch) return false

      // Department filter
      if (departmentFilter !== "all") {
        if (departmentFilter === "no_department" && project.department?.id) return false
        if (departmentFilter !== "no_department" && project.department?.id !== departmentFilter) return false
      }

      if (excludeDone && project.status === "inactive") return false

      if (assignedToMeOnly && currentUserId) {
        const isOwner = project.owner?.id === currentUserId
        const isRequester = project.requesters?.some((requester) => requester.id === currentUserId)
        const isCollaborator = project.collaborators?.some((collab) => collab.id === currentUserId)
        if (!isOwner && !isRequester && !isCollaborator) return false
      }

      return true
    })
    return filtered.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    )
  }, [projects, deferredSearchQuery, departmentFilter, excludeDone, assignedToMeOnly, currentUserId, isSqaUser])
  const hasProjectSearch = deferredSearchQuery.trim().length > 0
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (departmentFilter !== "all") count += 1
    if (!excludeDone) count += 1
    if (assignedToMeOnly) count += 1
    return count
  }, [departmentFilter, excludeDone, assignedToMeOnly])

  const resetProjectFilters = useCallback(() => {
    setDepartmentFilter("all")
    setExcludeDone(true)
    setAssignedToMeOnly(false)
    setCurrentPage(1)
  }, [])

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / ROWS_PER_PAGE)
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedProjects = useMemo(
    () => filteredProjects.slice(startIndex, endIndex),
    [filteredProjects, startIndex, endIndex]
  )

  const updateProjectField = useCallback(async (
    projectId: string,
    field: string,
    value: string | null | undefined | string[] | boolean
  ) => {
    const cellKey = `${projectId}-${field}`
    setUpdatingFields(prev => ({ ...prev, [cellKey]: field }))

    try {
      const updates: any = {}
      if (field === "owner_id") {
        updates.owner_id = value || null
      } else if (field === "department_id") {
        updates.department_id = value || null
      } else if (field === "status") {
        updates.status = value
      } else if (field === "collaborator_ids") {
        updates.collaborator_ids = Array.isArray(value) ? value : []
      } else if (field === "requester_ids") {
        updates.requester_ids = Array.isArray(value) ? value : []
      } else if (field === "require_sqa") {
        updates.require_sqa = Boolean(value)
      }

      const result = await updateProject.mutateAsync({
        id: projectId,
        ...updates,
      })
      if (result?.project) {
        setProjects((prev) =>
          prev.map((project) => (project.id === projectId ? (result.project as ProjectRowData) : project))
        )
      }
      let label = "Status"
      if (field === "owner_id") label = "Owner"
      else if (field === "department_id") label = "Department"
      else if (field === "collaborator_ids") label = "Collaborators"
      else if (field === "requester_ids") label = "Project Requesters"
      else if (field === "require_sqa") label = "Require SQA"
      toast(`${label} updated`)
    } catch (error: any) {
      toast(error.message || "Failed to update project", "error")
    } finally {
      setUpdatingFields(prev => {
        const newState = { ...prev }
        delete newState[cellKey]
        return newState
      })
    }
  }, [updateProject])

  const togglePinProject = useCallback(async (projectId: string) => {
    const isPinned = pinnedProjectIds.includes(projectId)
    const nextPinnedProjectIds = isPinned
      ? pinnedProjectIds.filter((id) => id !== projectId)
      : [...pinnedProjectIds, projectId]

    try {
      await updatePreferences({ pinned_project_ids: nextPinnedProjectIds })
      toast(isPinned ? "Project unpinned" : "Project pinned")
    } catch (error: any) {
      toast(error.message || "Failed to update pinned projects", "error")
    }
  }, [pinnedProjectIds, updatePreferences])

  const handleEditProject = useCallback((project: ProjectRowData) => {
    setEditingProject(project)
  }, [])

  const handleArchiveProject = useCallback(
    async (project: ProjectRowData) => {
      if (project.status === "inactive") {
        toast("Project is already inactive")
        return
      }
      await updateProjectField(project.id, "status", "inactive")
    },
    [updateProjectField]
  )

  return (
    <div className="space-y-6">
      <section className="border-b pb-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full min-w-[220px] md:w-64">
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className={cn(toolbarInputClassName)}
              />
            </div>
            <div className="w-full min-w-[200px] md:w-56">
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className={toolbarInputClassName}
              >
                <option value="all">All departments</option>
                <option value="no_department">No department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={assignedToMeOnly}
                onChange={(event) => setAssignedToMeOnly(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              Assigned to me
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={excludeDone}
                onChange={(event) => setExcludeDone(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              Exclude inactive
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 px-3" onClick={resetProjectFilters}>
              Reset
            </Button>
            {canCreateProjects && (
              <Button type="button" size="sm" className="h-9 px-3" onClick={() => setProjectFormOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Create project
              </Button>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-slate-200 p-8 text-center bg-white">
          <p className="text-sm text-slate-500">
            {hasProjectSearch ? "No projects found" : "No projects yet. Create one to get started."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white">
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto relative">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm border-b border-slate-200">
                <tr className="hover:bg-transparent">
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-slate-500 w-[600px] min-w-[500px]">Project Name</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-slate-500">Progress</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-slate-500">Owner</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-slate-500">Requesters</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-slate-500">Collaborators</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-slate-500">Department</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-slate-500">Status</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-slate-500">Require SQA?</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-slate-500">Links</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-slate-500">Created</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
              {paginatedProjects.map((project) => {
                const stats = projectStats[project.id] || DEFAULT_PROJECT_STATS
                return (
                  <ProjectRow
                    key={project.id}
                    project={project as ProjectRowData}
                    stats={stats}
                    users={users}
                    departments={departments}
                    canEditProjects={canEditProjects}
                    updateProjectField={updateProjectField}
                    updatingFields={updatingFields}
                    isPinned={pinnedProjectIdSet.has(project.id)}
                    pinDisabled={isUpdatingPreferences}
                    onTogglePin={togglePinProject}
                    onEditProject={handleEditProject}
                    onArchiveProject={handleArchiveProject}
                  />
                )
              })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <div className="text-sm text-slate-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredProjects.length)} of {filteredProjects.length} projects
            </div>
            <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  Previous
                </Button>
                <div className="text-sm text-slate-500 px-2">
                  Page {currentPage} of {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Dialog open={isProjectFormOpen} onOpenChange={setProjectFormOpen}>
        <DialogContent showCloseButton={false} className="flex h-[90vh] max-w-2xl flex-col overflow-hidden gap-0 p-0">
          <DialogHeader className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <ProjectForm
              departments={departments}
              users={users}
              formId="create-project-form"
              hideSubmitButton={true}
              onSuccess={() => {
                setProjectFormOpen(false)
                toast("Project created successfully")
                router.refresh()
              }}
            />
          </div>
          <DialogFooter className="shrink-0 bg-slate-50 px-6 py-4 border-t border-slate-200 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setProjectFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-project-form">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent showCloseButton={false} className="flex h-[90vh] max-w-2xl flex-col overflow-hidden gap-0 p-0">
          <DialogHeader className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {editingProject ? (
              <ProjectForm
                departments={departments}
                users={users}
                initialData={{
                  id: editingProject.id,
                  name: editingProject.name,
                  description: editingProject.description || "",
                  status: editingProject.status,
                  require_sqa: editingProject.require_sqa,
                  department_id: editingProject.department?.id,
                  links: editingProject.links || [],
                  requester_ids:
                    editingProject.requester_ids ||
                    editingProject.requesters.map((requester) => requester.id),
                  collaborator_ids:
                    editingProject.collaborator_ids ||
                    editingProject.collaborators.map((collaborator) => collaborator.id),
                }}
                formId="edit-project-form"
                hideSubmitButton={true}
                onSuccess={() => {
                  setEditingProject(null)
                  toast("Project updated successfully")
                  router.refresh()
                }}
              />
            ) : null}
          </div>
          <DialogFooter className="shrink-0 bg-slate-50 px-6 py-4 border-t border-slate-200 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setEditingProject(null)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-project-form">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ProjectRowProps {
  project: ProjectRowData
  stats: { total: number; done: number; percentage: number }
  users: BasicUser[]
  departments: Department[]
  canEditProjects: boolean
  updateProjectField: (projectId: string, field: string, value: string | null | undefined | string[] | boolean) => Promise<void> | void
  updatingFields: Record<string, string>
  isPinned: boolean
  pinDisabled: boolean
  onTogglePin: (projectId: string) => void
  onEditProject: (project: ProjectRowData) => void
  onArchiveProject: (project: ProjectRowData) => Promise<void> | void
}

const ProjectRow = memo(function ProjectRow({
  project,
  stats,
}: ProjectRowProps) {
  const ownerLabel = project.owner?.name || project.owner?.email || "Unassigned"
  const requestersLabel =
    project.requesters && project.requesters.length > 0
      ? truncateText(
          project.requesters
            .map((r) => r.name || r.email)
            .join(", "),
          40
        )
      : "No requesters"
  const collaboratorsLabel =
    project.collaborators && project.collaborators.length > 0
      ? truncateText(
          project.collaborators
            .map((c) => c.name || c.email)
            .join(", "),
          40
        )
      : "No collaborators"

  return (
    <TableRow>
      <TableCell className="py-2 w-[600px] min-w-[500px]">
        <div className="flex items-start gap-2">
          <Link
            href={`/tickets?projectId=${project.id}`}
            className="flex min-w-0 flex-1 flex-col hover:underline"
          >
            <span className="text-sm">{project.name}</span>
            {project.description ? (
              <span className="text-xs text-slate-500 line-clamp-2">
                {project.description}
              </span>
            ) : null}
          </Link>
        </div>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-slate-500">
          {stats.total} tickets, {stats.done} done ({stats.percentage}%)
        </span>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-slate-500" title={ownerLabel}>
          {truncateText(ownerLabel, 32)}
        </span>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-slate-500" title={requestersLabel}>
          {requestersLabel}
        </span>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-slate-500" title={collaboratorsLabel}>
          {collaboratorsLabel}
        </span>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-slate-500">
          {project.department?.name || "No department"}
        </span>
      </TableCell>
      <TableCell className="py-2">
        <div className="flex items-center gap-1.5">
          {getStatusIcon(project.status)}
          <span className="text-xs capitalize">{project.status}</span>
        </div>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-muted-foreground">
          {project.require_sqa ? "Yes" : "No"}
        </span>
      </TableCell>
      <TableCell className="py-2">
        {project.links && project.links.length > 0 ? (
          <div className="flex flex-col gap-1">
            {project.links.slice(0, 2).map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline truncate max-w-[200px]"
              >
                <span className="truncate">{formatLinkLabel(url)}</span>
              </a>
            ))}
            {project.links.length > 2 && (
              <span className="text-xs text-slate-500">
                +{project.links.length - 2} more
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-500">-</span>
        )}
      </TableCell>
      <TableCell className="py-2 text-xs text-slate-500">
        {new Date(project.created_at).toLocaleDateString()}
      </TableCell>
    </TableRow>
  )
})
