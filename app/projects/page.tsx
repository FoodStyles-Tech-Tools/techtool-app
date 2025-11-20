"use client"

import { useState, useMemo, useEffect, useCallback, memo, useDeferredValue } from "react"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { useProjects, useDeleteProject, useCreateProject, useUpdateProject } from "@/hooks/use-projects"
import { useRequirePermission } from "@/hooks/use-require-permission"
import { useTickets } from "@/hooks/use-tickets"
import { useUsers } from "@/hooks/use-users"
import { UserSelectItem, UserSelectValue } from "@/components/user-select-item"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, X, Check, Link2, Circle } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { useDepartments } from "@/hooks/use-departments"
import { truncateText } from "@/lib/utils"

const ROWS_PER_PAGE = 20
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
}

interface ProjectRowData {
  id: string
  name: string
  description: string | null
  status: "open" | "in_progress" | "closed"
  links?: string[] | null
  created_at: string
  department: Department | null
  owner?: BasicUser | null
}

interface ProjectQuickAddData {
  name: string
  description: string
  status: "open" | "in_progress" | "closed"
  department_id?: string
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

export default function ProjectsPage() {
  // Require view permission for projects - redirects if not authorized
  const { hasPermission: canView, loading: permissionLoading } = useRequirePermission("projects", "view")
  
  // All hooks must be called before any conditional returns
  const { hasPermission } = usePermissions()
  const { data, isLoading } = useProjects()
  const deleteProject = useDeleteProject()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const { departments } = useDepartments()
  const { data: ticketsData } = useTickets()
  const { data: usersData } = useUsers()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [excludeDone, setExcludeDone] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [updatingFields, setUpdatingFields] = useState<Record<string, string>>({})
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const projects = useMemo(() => data || [], [data])
  const tickets = useMemo(() => ticketsData || [], [ticketsData])
  const users = useMemo(() => usersData || [], [usersData])
  // Only show loading if we have no data at all
  const loading = !data && isLoading
  const canCreateProjects = hasPermission("projects", "create")
  const canEditProjects = hasPermission("projects", "edit")
  const canDeleteProjects = hasPermission("projects", "delete")

  // Calculate ticket stats per project
  const projectTicketStats = useMemo(() => {
    const stats: Record<string, { total: number; done: number; percentage: number }> = {}
    projects.forEach(project => {
      const projectTickets = tickets.filter(t => t.project?.id === project.id)
      const total = projectTickets.length
      const done = projectTickets.filter(t => t.status === "completed" || t.status === "cancelled").length
      const percentage = total > 0 ? Math.round((done / total) * 100) : 0
      stats[project.id] = { total, done, percentage }
    })
    return stats
  }, [projects, tickets])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearchQuery, departmentFilter, excludeDone])

  // Keyboard shortcut: Press "a" to quick-add, ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC: Close quick-add form
      if (e.key === "Escape" && isAddingNew) {
        // Don't close if a select dropdown is open
        const target = e.target as HTMLElement | null
        const isSelectOpen = target?.closest('[role="listbox"]') || target?.closest('[data-state="open"]')
        if (!isSelectOpen) {
          e.preventDefault()
          e.stopPropagation()
          setIsAddingNew(false)
          return
        }
      }

      // Only trigger if "a" key is pressed (not Alt+A or Ctrl+A)
      if (e.key !== "a" && e.key !== "A") return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return

      // Don't trigger if user is typing in an input, textarea, or select
      const target = e.target as HTMLElement | null
      const isInputElement = target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      )
      if (isInputElement) return

      // Don't trigger if a dialog is open
      const hasOpenDialog = document.querySelector('[role="dialog"][data-state="open"]')
      if (hasOpenDialog) return

      // Don't trigger if already adding or no permission
      if (isAddingNew || !canCreateProjects) return

      e.preventDefault()
      setIsAddingNew(true)
    }

    window.addEventListener("keydown", handleKeyDown, true) // Use capture phase
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [isAddingNew, canCreateProjects])

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

      return true
    })
  }, [projects, deferredSearchQuery, departmentFilter, excludeDone])
  const hasProjectSearch = deferredSearchQuery.trim().length > 0

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) {
      return
    }

    try {
      await deleteProject.mutateAsync(id)
      toast("Project deleted successfully")
    } catch (error: any) {
      toast(error.message || "Failed to delete project", "error")
    }
  }, [deleteProject])

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / ROWS_PER_PAGE)
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedProjects = useMemo(
    () => filteredProjects.slice(startIndex, endIndex),
    [filteredProjects, startIndex, endIndex]
  )

  const handleQuickAdd = useCallback(async (formData: ProjectQuickAddData) => {
    if (!formData.name.trim()) {
      toast("Name is required", "error")
      return
    }

    try {
      await createProject.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        status: formData.status,
        department_id: formData.department_id || undefined,
      })
      toast("Project created successfully")
      setIsAddingNew(false)
    } catch (error: any) {
      toast(error.message || "Failed to create project", "error")
    }
  }, [createProject])

  const updateProjectField = useCallback(async (
    projectId: string,
    field: string,
    value: string | null | undefined | string[]
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
      }

      await updateProject.mutateAsync({
        id: projectId,
        ...updates,
      })
      toast(`${field === "owner_id" ? "Owner" : field === "department_id" ? "Department" : "Status"} updated`)
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

  // Don't render content if user doesn't have permission (will redirect)
  if (permissionLoading || !canView) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your projects and track progress
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm h-9 dark:bg-[#1f1f1f]"
        />
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[140px] h-9 dark:bg-[#1f1f1f]">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent className="dark:bg-[#1f1f1f]">
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
            id="exclude-done"
            checked={excludeDone}
            onCheckedChange={(checked) => setExcludeDone(checked === true)}
            className="dark:bg-[#1f1f1f]"
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
          {canCreateProjects && !isAddingNew && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingNew(true)}
              className="mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Quick Add Project
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 py-2 text-xs w-[600px] min-w-[500px]">Project Name</TableHead>
                <TableHead className="h-9 py-2 text-xs">Progress</TableHead>
                <TableHead className="h-9 py-2 text-xs">Owner</TableHead>
                <TableHead className="h-9 py-2 text-xs">Department</TableHead>
                <TableHead className="h-9 py-2 text-xs">Status</TableHead>
                <TableHead className="h-9 py-2 text-xs">Links</TableHead>
                <TableHead className="h-9 py-2 text-xs">Created</TableHead>
                <TableHead className="h-9 py-2 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAddingNew && canCreateProjects && (
                <QuickAddProjectRow
                  departments={departments}
                  onCancel={() => setIsAddingNew(false)}
                  onSubmit={handleQuickAdd}
                />
              )}
              {paginatedProjects.map((project) => {
                const stats = projectTicketStats[project.id] || DEFAULT_PROJECT_STATS
                return (
                  <ProjectRow
                    key={project.id}
                    project={project as ProjectRowData}
                    stats={stats}
                    users={users}
                    departments={departments}
                    canEditProjects={canEditProjects}
                    canDeleteProjects={canDeleteProjects}
                    updateProjectField={updateProjectField}
                    updatingFields={updatingFields}
                    onDelete={handleDelete}
                  />
                )
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredProjects.length)} of {filteredProjects.length} projects
            </div>
            <div className="flex items-center space-x-2">
              {canCreateProjects && !isAddingNew && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingNew(true)}
                  className="h-8"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Quick Add
                </Button>
              )}
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
    </div>
  )
}

interface QuickAddProjectRowProps {
  departments: Department[]
  onCancel: () => void
  onSubmit: (data: ProjectQuickAddData) => Promise<void>
}

const QuickAddProjectRow = memo(function QuickAddProjectRow({
  departments,
  onCancel,
  onSubmit,
}: QuickAddProjectRowProps) {
  const [formData, setFormData] = useState<ProjectQuickAddData>({
    name: "",
    description: "",
    status: "open",
    department_id: undefined,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!formData.name.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <TableRow className="bg-muted/30">
      <TableCell className="py-2 w-[600px] min-w-[500px]">
        <Input
          placeholder="Project name..."
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          className="h-7 text-sm dark:bg-[#1f1f1f]"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleSubmit()
            } else if (e.key === "Escape") {
              e.preventDefault()
              onCancel()
            }
          }}
        />
        <Input
          placeholder="Description (optional)..."
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          className="h-7 text-xs mt-1 dark:bg-[#1f1f1f]"
        />
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">-</TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">You</TableCell>
      <TableCell className="py-2">
        <Select
          value={formData.department_id || "no_department"}
          onValueChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              department_id: value === "no_department" ? undefined : value,
            }))
          }
        >
          <SelectTrigger className="h-7 w-[140px] text-xs dark:bg-[#1f1f1f]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-[#1f1f1f]">
            <SelectItem value="no_department">No Department</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2">
        <Select
          value={formData.status}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, status: value as "open" | "in_progress" | "closed" }))
          }
        >
          <SelectTrigger className="h-7 w-[120px] text-xs relative dark:bg-[#1f1f1f]">
            {formData.status ? (
              <div className="absolute left-2 flex items-center gap-1.5">
                {getStatusIcon(formData.status)}
                <span className="capitalize">{formData.status.replace("_", " ")}</span>
              </div>
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent className="dark:bg-[#1f1f1f]">
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
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">-</TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">-</TableCell>
      <TableCell className="py-2 text-right">
        <div className="flex justify-end space-x-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleSubmit}
            disabled={!formData.name.trim() || isSubmitting}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
})

interface ProjectRowProps {
  project: ProjectRowData
  stats: { total: number; done: number; percentage: number }
  users: BasicUser[]
  departments: Department[]
  canEditProjects: boolean
  canDeleteProjects: boolean
  updateProjectField: (projectId: string, field: string, value: string | null | undefined | string[]) => Promise<void> | void
  updatingFields: Record<string, string>
  onDelete: (id: string) => Promise<void> | void
}

const ProjectRow = memo(function ProjectRow({
  project,
  stats,
  users,
  departments,
  canEditProjects,
  canDeleteProjects,
  updateProjectField,
  updatingFields,
  onDelete,
}: ProjectRowProps) {
  const isUpdatingOwner = !!updatingFields[`${project.id}-owner_id`]
  const isUpdatingDept = !!updatingFields[`${project.id}-department_id`]
  const isUpdatingStatus = !!updatingFields[`${project.id}-status`]

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
            <SelectTrigger className="h-7 w-[150px] text-xs relative overflow-hidden pr-6 dark:bg-[#1f1f1f]">
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
            <SelectContent className="dark:bg-[#1f1f1f]">
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
          <Select
            value={project.department?.id || "no_department"}
            onValueChange={(value) =>
              updateProjectField(project.id, "department_id", value === "no_department" ? null : value)
            }
            disabled={isUpdatingDept}
          >
            <SelectTrigger className="h-7 w-[140px] text-xs dark:bg-[#1f1f1f]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1f1f1f]">
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
            <SelectTrigger className="h-7 w-[120px] text-xs relative dark:bg-[#1f1f1f]">
              {project.status ? (
                <div className="absolute left-2 flex items-center gap-1.5">
                  {getStatusIcon(project.status)}
                  <span className="capitalize">{project.status.replace("_", " ")}</span>
                </div>
              ) : (
                <SelectValue />
              )}
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1f1f1f]">
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
                <Link2 className="h-3 w-3 flex-shrink-0" />
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
      <TableCell className="py-2 text-right">
        {canDeleteProjects && (
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" size="icon" onClick={() => onDelete(project.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  )
})
