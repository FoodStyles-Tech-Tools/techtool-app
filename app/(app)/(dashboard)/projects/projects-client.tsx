"use client"

import { useState, useMemo, useEffect, useCallback, memo, useDeferredValue } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { useUpdateProject } from "@/hooks/use-projects"
import { UserSelectItem, UserSelectValue } from "@/components/user-select-item"
import { CollaboratorSelector } from "@/components/collaborator-selector"
import {
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { Plus, Circle } from "lucide-react"
import { BrandLinkIcon } from "@/components/brand-link-icon"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { truncateText } from "@/lib/utils"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ProjectForm } from "@/components/forms/project-form"

const ROWS_PER_PAGE = 20
type ProjectTicketStats = { total: number; done: number; percentage: number }
const DEFAULT_PROJECT_STATS = { total: 0, done: 0, percentage: 0 }

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
  status: "open" | "in_progress" | "closed"
  require_sqa: boolean
  links?: string[] | null
  created_at: string
  department: Department | null
  owner?: BasicUser | null
  collaborators: BasicUser[]
  collaborator_ids?: string[]
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "open":
      return <Circle className="h-3 w-3 fill-gray-500 text-gray-500" />
    case "in_progress":
      return <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />
    case "closed":
      return <Circle className="h-3 w-3 fill-green-500 text-green-500" />
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
  
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [excludeDone, setExcludeDone] = useState(true)
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(true)
  const [isProjectFormOpen, setProjectFormOpen] = useState(false)
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

  // Calculate ticket stats per project
  const projectStats = projectTicketStats

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearchQuery, departmentFilter, excludeDone, assignedToMeOnly])

  const currentUserId = currentUser?.id

  const filteredProjects = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase()
    return projects.filter((project) => {
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

      // Exclude done filter (exclude "closed" projects)
      if (excludeDone && project.status === "closed") return false

      if (assignedToMeOnly && currentUserId) {
        const isOwner = project.owner?.id === currentUserId
        const isCollaborator = project.collaborators?.some((collab) => collab.id === currentUserId)
        if (!isOwner && !isCollaborator) return false
      }

      return true
    })
  }, [projects, deferredSearchQuery, departmentFilter, excludeDone, assignedToMeOnly, currentUserId])
  const hasProjectSearch = deferredSearchQuery.trim().length > 0

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h1 className="typography-h3">Projects</h1>
          <p className="typography-muted mt-0.5">
            Manage your projects and track progress
          </p>
        </div>
        {canCreateProjects && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProjectFormOpen(true)}
            className="ml-auto h-9"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-[256px] h-9 dark:bg-input"
        />
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[140px] h-9 dark:bg-input">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent className="dark:bg-input">
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="no_department">No Department</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="assigned-to-me"
            checked={assignedToMeOnly}
            onCheckedChange={(checked) => setAssignedToMeOnly(checked !== false)}
            className="dark:bg-input"
          />
          <Label
            htmlFor="assigned-to-me"
            className="text-sm font-normal cursor-pointer whitespace-nowrap"
          >
            Assigned to me
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="exclude-done"
            checked={excludeDone}
            onCheckedChange={(checked) => setExcludeDone(checked === true)}
            className="dark:bg-input"
          />
          <Label
            htmlFor="exclude-done"
            className="text-sm font-normal cursor-pointer whitespace-nowrap"
          >
            Exclude Done
          </Label>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {hasProjectSearch ? "No projects found" : "No projects yet. Create one to get started."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto relative">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 z-20 bg-muted shadow-sm border-b [&_tr]:border-b">
                <tr className="hover:bg-transparent border-b">
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground w-[600px] min-w-[500px]">Project Name</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Progress</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Owner</th>
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
                  />
                )
              })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3">
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
          <DialogHeader className="border-b px-6 py-4">
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
          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setProjectFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-project-form">
              Create
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
}

const ProjectRow = memo(function ProjectRow({
  project,
  stats,
  users,
  departments,
  canEditProjects,
  updateProjectField,
  updatingFields,
}: ProjectRowProps) {
  const isUpdatingOwner = !!updatingFields[`${project.id}-owner_id`]
  const isUpdatingDept = !!updatingFields[`${project.id}-department_id`]
  const isUpdatingStatus = !!updatingFields[`${project.id}-status`]
  const isUpdatingCollaborators = !!updatingFields[`${project.id}-collaborator_ids`]
  const isUpdatingRequireSqa = !!updatingFields[`${project.id}-require_sqa`]
  const collaboratorIds = project.collaborators?.map((collab) => collab.id) || []

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="py-2 w-[600px] min-w-[500px]">
        <Link href={`/projects/${project.id}`} className="hover:underline flex flex-col">
          <span className="text-sm">{project.name}</span>
          <span className="text-xs text-muted-foreground line-clamp-2">
            {project.description || "No description"}
          </span>
        </Link>
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
          <Select
            value={project.owner?.id || ""}
            onValueChange={(value) => updateProjectField(project.id, "owner_id", value)}
            disabled={isUpdatingOwner}
          >
            <SelectTrigger className="h-7 w-[150px] text-xs relative overflow-hidden pr-6 dark:bg-input">
              {project.owner?.id ? (
                <div className="absolute inset-y-0 left-2 right-6 flex items-center pointer-events-none">
                  <UserSelectValue
                    users={users}
                    value={project.owner.id}
                    placeholder="Select owner"
                    maxLength={16}
                  />
                </div>
              ) : (
                <SelectValue placeholder="Select owner" />
              )}
            </SelectTrigger>
            <SelectContent className="dark:bg-input">
              {users.map((user) => (
                <UserSelectItem key={user.id} user={user} value={user.id} className="text-xs" maxLength={24} />
              ))}
            </SelectContent>
          </Select>
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
            value={collaboratorIds}
            onChange={(ids) => updateProjectField(project.id, "collaborator_ids", ids)}
            placeholder="Select collaborators"
            buttonClassName="w-[180px] text-xs dark:bg-input"
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
          <Select
            value={project.department?.id || "no_department"}
            onValueChange={(value) =>
              updateProjectField(project.id, "department_id", value === "no_department" ? null : value)
            }
            disabled={isUpdatingDept}
          >
            <SelectTrigger className="h-7 w-[140px] text-xs dark:bg-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-input">
              <SelectItem value="no_department">No Department</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground">
            {project.department?.name || "No Department"}
          </span>
        )}
      </TableCell>
      <TableCell className="py-2">
        {canEditProjects ? (
          <Select
            value={project.status}
            onValueChange={(value) => updateProjectField(project.id, "status", value)}
            disabled={isUpdatingStatus}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs relative dark:bg-input">
              {project.status ? (
                <div className="absolute left-2 flex items-center gap-1.5">
                  {getStatusIcon(project.status)}
                  <span className="capitalize">{project.status.replace("_", " ")}</span>
                </div>
              ) : (
                <SelectValue />
              )}
            </SelectTrigger>
            <SelectContent className="dark:bg-input">
              <SelectItem value="open">
                <div className="flex items-center gap-1.5">
                  <Circle className="h-3 w-3 fill-gray-500 text-gray-500" />
                  Open
                </div>
              </SelectItem>
              <SelectItem value="in_progress">
                <div className="flex items-center gap-1.5">
                  <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  In Progress
                </div>
              </SelectItem>
              <SelectItem value="closed">
                <div className="flex items-center gap-1.5">
                  <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                  Closed
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-1.5">
            {getStatusIcon(project.status)}
            <span className="text-xs capitalize">{project.status.replace("_", " ")}</span>
          </div>
        )}
      </TableCell>
      <TableCell className="py-2">
        {canEditProjects ? (
          <Checkbox
            checked={project.require_sqa}
            onCheckedChange={(checked) => updateProjectField(project.id, "require_sqa", checked === true)}
            disabled={isUpdatingRequireSqa}
            className="dark:bg-input"
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
