"use client"

import { useState, useMemo, useEffect, useCallback, memo, useDeferredValue } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { useUpdateProject } from "@/hooks/use-projects"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import { CollaboratorSelector } from "@/components/collaborator-selector"
import {
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { Plus, Circle, Search, Pin, Pencil, Archive } from "lucide-react"
import { BrandLinkIcon } from "@/components/brand-link-icon"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { cn, truncateText } from "@/lib/utils"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProjectForm } from "@/components/forms/project-form"

const ROWS_PER_PAGE = 20
type ProjectTicketStats = { total: number; done: number; percentage: number }
const DEFAULT_PROJECT_STATS = { total: 0, done: 0, percentage: 0 }
const toolbarInputClassName =
  "h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/20"
const toolbarToggleClassName =
  "flex min-h-10 items-center gap-2 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground"
const cellSelectClassName =
  "h-8 w-full rounded-md border border-border/40 bg-background/55 px-2 text-xs text-foreground outline-none transition-colors focus:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-70"
const iconButtonClassName =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"

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
      <section className="rounded-lg border border-border/50 bg-background">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_220px_auto_auto]">
              <label className="space-y-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Search
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className={cn(toolbarInputClassName, "pl-9")}
                  />
                </div>
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Department
                </span>
                <select
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                  className={toolbarInputClassName}
                >
                  <option value="all">All Departments</option>
                  <option value="no_department">No Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={toolbarToggleClassName}>
                <input
                  type="checkbox"
                  checked={assignedToMeOnly}
                  onChange={(event) => setAssignedToMeOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-border text-foreground"
                />
                <span>Assigned to me</span>
              </label>
              <label className={toolbarToggleClassName}>
                <input
                  type="checkbox"
                  checked={excludeDone}
                  onChange={(event) => setExcludeDone(event.target.checked)}
                  className="h-4 w-4 rounded border-border text-foreground"
                />
                <span>Exclude inactive</span>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasProjectSearch || activeFilterCount > 0 ? (
                <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  {hasProjectSearch ? "Search active" : null}
                  {hasProjectSearch && activeFilterCount > 0 ? " · " : null}
                  {activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : null}
                </div>
              ) : null}
              <Button variant="outline" size="sm" className="h-10" onClick={resetProjectFilters}>
                Reset
              </Button>
              {canCreateProjects && (
                <button
                  type="button"
                  onClick={() => setProjectFormOpen(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-border/60 bg-background px-3 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Project</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {hasProjectSearch ? "No projects found" : "No projects yet. Create one to get started."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border/35 bg-muted/10">
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto relative">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 z-20 bg-muted/80 shadow-sm border-b border-border/35">
                <tr className="hover:bg-transparent">
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground w-[600px] min-w-[500px]">Project Name</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Progress</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Owner</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Requesters</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Collaborators</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Department</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Status</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Require SQA?</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Links</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Created</th>
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
          <div className="flex items-center justify-between border-t border-border/35 px-4 py-3">
            <div className="text-sm text-muted-foreground">
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
                <div className="text-sm text-muted-foreground px-2">
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
          <DialogHeader className="bg-muted/40 px-6 py-4">
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
          <DialogFooter className="shrink-0 bg-muted/40 px-6 py-4 sm:justify-end">
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
          <DialogHeader className="bg-muted/40 px-6 py-4">
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
          <DialogFooter className="shrink-0 bg-muted/40 px-6 py-4 sm:justify-end">
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
  users,
  departments,
  canEditProjects,
  updateProjectField,
  updatingFields,
  isPinned,
  pinDisabled,
  onTogglePin,
  onEditProject,
  onArchiveProject,
}: ProjectRowProps) {
  const isUpdatingOwner = !!updatingFields[`${project.id}-owner_id`]
  const isUpdatingDept = !!updatingFields[`${project.id}-department_id`]
  const isUpdatingStatus = !!updatingFields[`${project.id}-status`]
  const isUpdatingRequesters = !!updatingFields[`${project.id}-requester_ids`]
  const isUpdatingCollaborators = !!updatingFields[`${project.id}-collaborator_ids`]
  const isUpdatingRequireSqa = !!updatingFields[`${project.id}-require_sqa`]
  const requesterIds = project.requesters?.map((requester) => requester.id) || []
  const collaboratorIds = project.collaborators?.map((collab) => collab.id) || []

  return (
    <TableRow className="border-b-0 even:bg-muted/20 hover:bg-muted/35">
      <TableCell className="py-2 w-[600px] min-w-[500px]">
        <div className="flex items-start gap-2">
          <Link
            href={`/tickets?projectId=${project.id}`}
            className="hover:underline flex min-w-0 flex-1 flex-col"
          >
            <span className="text-sm">{project.name}</span>
            <span className="text-xs text-muted-foreground line-clamp-2">
              {project.description || "No description"}
            </span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0",
              isPinned ? "text-amber-500 hover:text-amber-500" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onTogglePin(project.id)
            }}
            disabled={pinDisabled}
            title={isPinned ? "Unpin project" : "Pin project"}
            aria-label={isPinned ? "Unpin project" : "Pin project"}
          >
            <Pin className={cn("h-3.5 w-3.5", isPinned ? "fill-current" : "")} />
          </Button>
          {canEditProjects ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={iconButtonClassName}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onEditProject(project)
                }}
                aria-label="Edit project"
                title="Edit project"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={iconButtonClassName}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  void onArchiveProject(project)
                }}
                disabled={project.status === "inactive"}
                aria-label="Archive project"
                title="Archive project"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="py-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">
            {stats.total} ticket{stats.total !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-muted-foreground">
            {stats.done} done · {stats.percentage}%
          </span>
        </div>
      </TableCell>
      <TableCell className="py-2">
        {canEditProjects ? (
          <select
            value={project.owner?.id || ""}
            onChange={(event) => updateProjectField(project.id, "owner_id", event.target.value || null)}
            disabled={isUpdatingOwner}
            className={cn(cellSelectClassName, "w-[150px]")}
          >
            <option value="">Select owner</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {truncateText(user.name || user.email, 24)}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center space-x-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={project.owner?.image || undefined} alt={project.owner?.name || ""} />
              <AvatarFallback>
                {project.owner?.name?.[0]?.toUpperCase() || project.owner?.email?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground max-w-[150px] truncate" title={project.owner?.name || project.owner?.email || "Unassigned"}>
              {truncateText(project.owner?.name || project.owner?.email || "Unassigned", 18)}
            </span>
          </div>
        )}
      </TableCell>
      <TableCell className="py-2">
        {canEditProjects ? (
          <CollaboratorSelector
            users={users}
            value={requesterIds}
            onChange={(ids) => updateProjectField(project.id, "requester_ids", ids)}
            placeholder="Select requesters"
            buttonClassName="w-[180px] text-xs border-border/40 bg-background/55 hover:border-border/65"
            disabled={isUpdatingRequesters}
          />
        ) : requesterIds.length ? (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {project.requesters.slice(0, 3).map((requester) => (
                <Avatar key={requester.id} className="h-5 w-5 border border-background">
                  <AvatarImage src={requester.image || undefined} alt={requester.name || requester.email} />
                  <AvatarFallback className="text-[10px]">
                    {requester.name?.[0]?.toUpperCase() || requester.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {project.requesters.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{project.requesters.length - 3}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No requesters</span>
        )}
      </TableCell>
      <TableCell className="py-2">
        {canEditProjects ? (
          <CollaboratorSelector
            users={users}
            value={collaboratorIds}
            onChange={(ids) => updateProjectField(project.id, "collaborator_ids", ids)}
            placeholder="Select collaborators"
            buttonClassName="w-[180px] text-xs border-border/40 bg-background/55 hover:border-border/65"
            disabled={isUpdatingCollaborators}
          />
        ) : collaboratorIds.length ? (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {project.collaborators.slice(0, 3).map((collaborator) => (
                <Avatar key={collaborator.id} className="h-5 w-5 border border-background">
                  <AvatarImage src={collaborator.image || undefined} alt={collaborator.name || collaborator.email} />
                  <AvatarFallback className="text-[10px]">
                    {collaborator.name?.[0]?.toUpperCase() || collaborator.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {project.collaborators.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{project.collaborators.length - 3}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No collaborators</span>
        )}
      </TableCell>
      <TableCell className="py-2">
        {canEditProjects ? (
          <select
            value={project.department?.id || "no_department"}
            onChange={(event) =>
              updateProjectField(
                project.id,
                "department_id",
                event.target.value === "no_department" ? null : event.target.value
              )
            }
            disabled={isUpdatingDept}
            className={cn(cellSelectClassName, "w-[140px]")}
          >
            <option value="no_department">No Department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">
            {project.department?.name || "No Department"}
          </span>
        )}
      </TableCell>
      <TableCell className="py-2">
        {canEditProjects ? (
          <select
            value={project.status}
            onChange={(event) => updateProjectField(project.id, "status", event.target.value)}
            disabled={isUpdatingStatus}
            className={cn(cellSelectClassName, "w-[120px]")}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        ) : (
          <div className="flex items-center gap-1.5">
            {getStatusIcon(project.status)}
            <span className="text-xs capitalize">{project.status}</span>
          </div>
        )}
      </TableCell>
      <TableCell className="py-2">
        {canEditProjects ? (
          <input
            type="checkbox"
            checked={project.require_sqa}
            onChange={(event) => updateProjectField(project.id, "require_sqa", event.target.checked)}
            disabled={isUpdatingRequireSqa}
            className="h-4 w-4 rounded border-border text-foreground"
          />
        ) : (
          <span className="text-xs text-muted-foreground">{project.require_sqa ? "Yes" : "No"}</span>
        )}
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
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
              >
                <BrandLinkIcon url={url} className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{formatLinkLabel(url)}</span>
              </a>
            ))}
            {project.links.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{project.links.length - 2} more
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">
        {new Date(project.created_at).toLocaleDateString()}
      </TableCell>
    </TableRow>
  )
})
