"use client"

import { useState, useMemo, useEffect, useCallback, memo, useDeferredValue } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { Copy, Plus, X, Check, Link2 } from "lucide-react"
import Link from "next/link"
import { useDepartments } from "@/hooks/use-departments"
import { useTickets, useUpdateTicket, useCreateTicket } from "@/hooks/use-tickets"
import { useProjects } from "@/hooks/use-projects"
import { useUsers } from "@/hooks/use-users"
import { usePermissions } from "@/hooks/use-permissions"
import { useRequirePermission } from "@/hooks/use-require-permission"
import { useQueryClient } from "@tanstack/react-query"
import { UserSelectItem, UserSelectValue } from "@/components/user-select-item"
import { TicketTypeSelect } from "@/components/ticket-type-select"
import { TicketPrioritySelect } from "@/components/ticket-priority-select"
import { TicketStatusSelect } from "@/components/ticket-status-select"
import { TicketDetailDialog } from "@/components/ticket-detail-dialog"
import { Skeleton } from "@/components/ui/skeleton"

const ASSIGNEE_ALLOWED_ROLES = new Set(["admin", "member"])
const ROWS_PER_PAGE = 20
const UNASSIGNED_VALUE = "unassigned"
const NO_DEPARTMENT_VALUE = "no_department"

interface Ticket {
  id: string
  display_id: string | null
  title: string
  description: string | null
  status: string
  priority: string
  type: string
  links: string[]
  department: {
    id: string
    name: string
  } | null
  project: {
    id: string
    name: string
  } | null
  assignee: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
  requested_by: {
    id: string
    name: string | null
    email: string
  }
  created_at: string
  started_at?: string | null
  completed_at?: string | null
  assigned_at?: string | null
}

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

interface QuickAddTicketData {
  title: string
  description: string
  type: "bug" | "request" | "task"
  priority: "low" | "medium" | "high" | "urgent"
  status: string
  department_id?: string
  assignee_id?: string
  requested_by_id?: string
}

const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffDays === 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays >= 2 && diffDays <= 7) return `${diffDays} days ago`
  if (diffWeeks >= 1 && diffWeeks <= 4) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`
  if (diffMonths >= 1 && diffMonths <= 12) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`
  if (diffYears >= 1) return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`
  return "long time ago"
}

const formatLinkLabel = (url: string) => {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export default function TicketsPage() {
  // Require view permission for tickets - redirects if not authorized
  const { hasPermission: canView, loading: permissionLoading } = useRequirePermission("tickets", "view")
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [requestedByFilter, setRequestedByFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [excludeDone, setExcludeDone] = useState(true)
  const [updatingFields, setUpdatingFields] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  
  const { user, hasPermission } = usePermissions()
  const createTicket = useCreateTicket()
  
  // Set default assignee filter to "My Tickets" when user is available (only once on initial load)
  useEffect(() => {
    if (user?.id && assigneeFilter === "all") {
      setAssigneeFilter(user.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])
  
  // Reset status filter if it's cancelled or completed when excludeDone is enabled
  useEffect(() => {
    if (excludeDone && (statusFilter === "cancelled" || statusFilter === "completed")) {
      setStatusFilter("all")
    }
  }, [excludeDone, statusFilter])

  // Keyboard shortcut: Press "a" to quick-add
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
      if (isAddingNew || !hasPermission("tickets", "create")) return

      e.preventDefault()
      setIsAddingNew(true)
    }

    window.addEventListener("keydown", handleKeyDown, true) // Use capture phase
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [isAddingNew, hasPermission])

  // Fetch tickets with server-side filtering (except search which is client-side for now)
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets({
    status: statusFilter !== "all" ? statusFilter : undefined,
    project_id: projectFilter !== "all" ? projectFilter : undefined,
    department_id: departmentFilter !== "all" && departmentFilter !== "no_department" ? departmentFilter : departmentFilter === "no_department" ? "no_department" : undefined,
    assignee_id: assigneeFilter !== "all" ? assigneeFilter : undefined,
    requested_by_id: requestedByFilter !== "all" ? requestedByFilter : undefined,
    exclude_done: excludeDone,
    limit: ROWS_PER_PAGE,
    page: currentPage,
  })
  const { data: projectsData } = useProjects()
  const { data: usersData } = useUsers()
  const { departments } = useDepartments()
  const updateTicket = useUpdateTicket()

  // Reset page when filters change (but not search, which is client-side)
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, projectFilter, departmentFilter, requestedByFilter, assigneeFilter, excludeDone])

  const allTickets = ticketsData || []
  const projects = projectsData || []
  const users = usersData || []
  // Only show loading if we have no data at all
  const loading = !ticketsData && ticketsLoading
  const canCreateTickets = hasPermission("tickets", "create")

  const FIELD_LABELS: Record<string, string> = {
    status: "Status",
    priority: "Priority",
    type: "Type",
    requested_by_id: "Requested By",
    assignee_id: "Assignee",
    department_id: "Department",
  }

  const assigneeEligibleUsers = useMemo(
    () => users.filter((user) =>
      user.role ? ASSIGNEE_ALLOWED_ROLES.has(user.role.toLowerCase()) : false
    ),
    [users]
  )

  // Client-side search filtering only (other filters are server-side)
  // Use debounced search to avoid filtering on every keystroke
  const filteredTickets = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase()
    if (!normalizedQuery) {
      return allTickets
    }
    
    return allTickets.filter((ticket) => {
      return (
        ticket.title.toLowerCase().includes(normalizedQuery) ||
        ticket.description?.toLowerCase().includes(normalizedQuery) ||
        ticket.project?.name.toLowerCase().includes(normalizedQuery) ||
        ticket.display_id?.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [allTickets, deferredSearchQuery])

  // Memoize callbacks before early return to maintain hook order
  const handleCopyTicketLabel = useCallback((ticket: Ticket) => {
    const projectName = ticket.project?.name || "No Project"
    const label = `[${projectName}] ${ticket.display_id || ticket.id.slice(0, 8)}_${ticket.title}`
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(label)
        .then(() => toast("Copied ticket info"))
        .catch(() => toast("Failed to copy ticket info", "error"))
    } else {
      toast("Clipboard not available", "error")
    }
  }, [])

  const updateTicketField = useCallback(async (
    ticketId: string,
    field: string,
    value: string | null | undefined
  ) => {
    // Get current ticket to check previous values
    const currentTicket = allTickets.find(t => t.id === ticketId)
    
    const body: any = {}
    if (field === "requested_by_id") {
      if (!value) {
        toast("Requested by cannot be empty", "error")
        return
      }
      body[field] = value
    } else if (field === "assignee_id") {
      const previousAssigneeId = currentTicket?.assignee?.id || null
      const newAssigneeId = value || null
      body[field] = newAssigneeId
      
      // Condition 1: When assignee changed from Null -> add value then add assigned_at timestamp
      // Condition 2: If assignee is not null then change value then change timestamp assigned_at
      if (!newAssigneeId) {
        body.assigned_at = null
      } else if (!previousAssigneeId || previousAssigneeId !== newAssigneeId) {
        body.assigned_at = new Date().toISOString()
      }
    } else if (field === "status") {
      const previousStatus = currentTicket?.status
      const newStatus = value as string
      body[field] = newStatus
      
      // Condition 2: When status from Open/Blocked to any other status then update started_at timestamp
      if ((previousStatus === "open" || previousStatus === "blocked") && newStatus !== "open" && newStatus !== "blocked") {
        body.started_at = new Date().toISOString()
      }
      
      // Condition 3: When any status changed to Cancelled or Completed then update completed_at timestamp
      if (newStatus === "completed" || newStatus === "cancelled") {
        body.completed_at = new Date().toISOString()
        // Also ensure started_at is set if not already
        const ticketStartedAt = (currentTicket as any)?.started_at
        if (!ticketStartedAt) {
          body.started_at = new Date().toISOString()
        }
      }
      
      // Condition 4: If status changed from Completed/Cancelled to other status then remove timestamp completed_at
      if ((previousStatus === "completed" || previousStatus === "cancelled") && newStatus !== "completed" && newStatus !== "cancelled") {
        body.completed_at = null
      }
      
      // Condition 5: If status changed from In Progress to Blocked or Open then remove timestamp started_at
      if (previousStatus === "in_progress" && (newStatus === "blocked" || newStatus === "open")) {
        body.started_at = null
      }
      
      // Additional: If status is open, clear started_at and completed_at
      if (newStatus === "open") {
        body.started_at = null
        body.completed_at = null
      }
    } else if (field === "department_id") {
      body[field] = value || null
    } else {
      body[field] = value
    }

    const cellKey = `${ticketId}-${field}`
    setUpdatingFields(prev => ({ ...prev, [cellKey]: field }))

    try {
      await updateTicket.mutateAsync({
        id: ticketId,
        ...body,
      })
      toast(`${FIELD_LABELS[field] || "Ticket"} updated`)
    } catch (error: any) {
      toast(error.message || "Failed to update ticket", "error")
    } finally {
      setUpdatingFields(prev => {
        const newState = { ...prev }
        delete newState[cellKey]
        return newState
      })
    }
  }, [allTickets, updateTicket])

  const handleQuickAdd = useCallback(async (formData: QuickAddTicketData) => {
    if (!formData.title.trim()) {
      toast("Title is required", "error")
      return
    }

    try {
      await createTicket.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        priority: formData.priority,
        project_id: null,
        department_id: formData.department_id || undefined,
        assignee_id: formData.assignee_id || undefined,
        requested_by_id: formData.requested_by_id,
        status: formData.status,
      })
      toast("Ticket created successfully")
      setIsAddingNew(false)
    } catch (error: any) {
      toast(error.message || "Failed to create ticket", "error")
    }
  }, [createTicket])

  const hasSearchQuery = deferredSearchQuery.trim().length > 0

  // Pagination - server-side pagination is handled by useTickets
  // For client-side search, we need to handle pagination here
  const totalPages = hasSearchQuery 
    ? Math.ceil(filteredTickets.length / ROWS_PER_PAGE)
    : Math.ceil((ticketsData?.length || 0) / ROWS_PER_PAGE) // Server provides pagination info
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedTickets = useMemo(
    () => (hasSearchQuery ? filteredTickets.slice(startIndex, endIndex) : filteredTickets),
    [filteredTickets, hasSearchQuery, startIndex, endIndex]
  )

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
          <h1 className="text-2xl">Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View and manage all tickets across projects
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        <Input
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm h-9 dark:bg-[#1f1f1f]"
        />
        <Button
          variant={assigneeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setAssigneeFilter("all")}
          className="h-9"
        >
          All Tickets
        </Button>
        <Button
          variant={assigneeFilter === user?.id ? "default" : "outline"}
          size="sm"
          onClick={() => setAssigneeFilter(user?.id || "all")}
          className="h-9"
          disabled={!user}
        >
          My Tickets
        </Button>
        <Button
          variant={assigneeFilter === "unassigned" ? "default" : "outline"}
          size="sm"
          onClick={() => setAssigneeFilter("unassigned")}
          className="h-9"
        >
          Unassigned
        </Button>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9 dark:bg-[#1f1f1f]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="dark:bg-[#1f1f1f]">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="cancelled" disabled={excludeDone}>Cancelled</SelectItem>
            <SelectItem value="completed" disabled={excludeDone}>Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[140px] h-9 dark:bg-[#1f1f1f]">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent className="dark:bg-[#1f1f1f]">
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Select value={requestedByFilter} onValueChange={setRequestedByFilter}>
          <SelectTrigger className="w-[140px] h-9 relative dark:bg-[#1f1f1f]">
            {requestedByFilter !== "all" ? (
              <div className="absolute left-2">
                <UserSelectValue
                  users={users}
                  value={requestedByFilter}
                  placeholder="Requested by"
                />
              </div>
            ) : (
              <SelectValue placeholder="Requested by" />
            )}
          </SelectTrigger>
          <SelectContent className="dark:bg-[#1f1f1f]">
            <SelectItem value="all">All Requesters</SelectItem>
            {users.map((user) => (
              <UserSelectItem key={user.id} user={user} value={user.id} />
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
        <div className="rounded-md border">
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {hasSearchQuery ? "No tickets found" : "No tickets yet."}
          </p>
          {hasPermission("tickets", "create") && !isAddingNew && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingNew(true)}
              className="mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Quick Add Ticket
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 py-2 text-xs">ID</TableHead>
                <TableHead className="h-9 py-2 text-xs w-[400px] min-w-[300px]">Title</TableHead>
                <TableHead className="h-9 py-2 text-xs">Type</TableHead>
                <TableHead className="h-9 py-2 text-xs">Department</TableHead>
                <TableHead className="h-9 py-2 text-xs">Status</TableHead>
                <TableHead className="h-9 py-2 text-xs">Priority</TableHead>
                <TableHead className="h-9 py-2 text-xs">Links</TableHead>
                <TableHead className="h-9 py-2 text-xs">Requested By</TableHead>
                <TableHead className="h-9 py-2 text-xs">Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAddingNew && canCreateTickets && (
                <QuickAddRow
                  departments={departments}
                  users={users}
                  assigneeEligibleUsers={assigneeEligibleUsers}
                  onCancel={() => setIsAddingNew(false)}
                  onSubmit={handleQuickAdd}
                  defaultDepartmentId={departmentFilter !== "all" && departmentFilter !== "no_department" ? departmentFilter : undefined}
                  defaultAssigneeId={assigneeFilter !== "all" && assigneeFilter !== "unassigned" ? assigneeFilter : undefined}
                  defaultRequesterId={user?.id}
                />
              )}
              {paginatedTickets.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  onCopy={handleCopyTicketLabel}
                  onSelectTicket={setSelectedTicketId}
                  departments={departments}
                  users={users}
                  assigneeEligibleUsers={assigneeEligibleUsers}
                  updateTicketField={updateTicketField}
                  updatingFields={updatingFields}
                  excludeDone={excludeDone}
                />
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTickets.length)} of {filteredTickets.length} tickets
            </div>
            <div className="flex items-center space-x-2">
              {hasPermission("tickets", "create") && !isAddingNew && (
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
      
      <TicketDetailDialog
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicketId(null)
          }
        }}
      />
    </div>
  )
}

interface QuickAddRowProps {
  departments: Department[]
  users: BasicUser[]
  assigneeEligibleUsers: BasicUser[]
  onCancel: () => void
  onSubmit: (data: QuickAddTicketData) => Promise<void>
  defaultDepartmentId?: string
  defaultAssigneeId?: string
  defaultRequesterId?: string
}

const QuickAddRow = memo(function QuickAddRow({
  departments,
  users,
  assigneeEligibleUsers,
  onCancel,
  onSubmit,
  defaultDepartmentId,
  defaultAssigneeId,
  defaultRequesterId,
}: QuickAddRowProps) {
  const [formData, setFormData] = useState<QuickAddTicketData>(() => ({
    title: "",
    description: "",
    type: "task",
    priority: "medium",
    status: "open",
    department_id: defaultDepartmentId,
    assignee_id: defaultAssigneeId,
    requested_by_id: defaultRequesterId,
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!defaultRequesterId) return
    setFormData((prev) => {
      if (prev.requested_by_id) return prev
      return { ...prev, requested_by_id: defaultRequesterId }
    })
  }, [defaultRequesterId])

  const handleSubmit = async () => {
    if (!formData.title.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <TableRow className="bg-muted/30">
        <TableCell className="py-2">
          <span className="text-xs font-mono text-muted-foreground">-</span>
        </TableCell>
        <TableCell className="py-2 w-[400px] min-w-[300px]">
          <Input
            placeholder="Title..."
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
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
        <TableCell className="py-2">
          <TicketTypeSelect
            value={formData.type}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as "bug" | "request" | "task" }))}
          />
        </TableCell>
        <TableCell className="py-2">
          <Select
            value={formData.department_id || NO_DEPARTMENT_VALUE}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                department_id: value === NO_DEPARTMENT_VALUE ? undefined : value,
              }))
            }
          >
            <SelectTrigger className="h-7 w-[140px] text-xs dark:bg-[#1f1f1f]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1f1f1f]">
              <SelectItem value={NO_DEPARTMENT_VALUE}>No Department</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-2">
          <TicketStatusSelect
            value={formData.status}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
            excludeDone={false}
          />
        </TableCell>
        <TableCell className="py-2">
          <TicketPrioritySelect
            value={formData.priority}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value as "low" | "medium" | "high" | "urgent" }))}
          />
        </TableCell>
        <TableCell className="py-2 text-xs text-muted-foreground">-</TableCell>
        <TableCell className="py-2">
          <Select
            value={formData.requested_by_id || ""}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                requested_by_id: value || undefined,
              }))
            }
          >
            <SelectTrigger className="h-7 w-[150px] text-xs relative dark:bg-[#1f1f1f] overflow-hidden">
              {formData.requested_by_id ? (
                <div className="absolute left-2 right-8 top-0 bottom-0 flex items-center overflow-hidden">
                  <UserSelectValue users={users} value={formData.requested_by_id} placeholder="Select user" />
                </div>
              ) : (
                <SelectValue placeholder="Select user" />
              )}
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1f1f1f]">
              {users.map((user) => (
                <UserSelectItem key={user.id} user={user} value={user.id} className="text-xs" />
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-2">
          <Select
            value={formData.assignee_id || UNASSIGNED_VALUE}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                assignee_id: value === UNASSIGNED_VALUE ? undefined : value,
              }))
            }
          >
            <SelectTrigger className="h-7 w-[150px] text-xs relative dark:bg-[#1f1f1f] overflow-hidden">
              {formData.assignee_id ? (
                <div className="absolute left-2 right-8 top-0 bottom-0 flex items-center overflow-hidden">
                  <UserSelectValue
                    users={assigneeEligibleUsers}
                    value={formData.assignee_id}
                    placeholder="Unassigned"
                    unassignedValue={UNASSIGNED_VALUE}
                    unassignedLabel="Unassigned"
                  />
                </div>
              ) : (
                <SelectValue placeholder="Unassigned" />
              )}
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1f1f1f]">
              <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
              {assigneeEligibleUsers.map((user) => (
                <UserSelectItem key={user.id} user={user} value={user.id} className="text-xs" />
              ))}
            </SelectContent>
          </Select>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={9} className="py-2">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSubmit}
              disabled={!formData.title.trim() || isSubmitting}
            >
              Confirm
            </Button>
          </div>
        </TableCell>
      </TableRow>
    </>
  )
})

interface TicketRowProps {
  ticket: Ticket
  onCopy: (ticket: Ticket) => void
  onSelectTicket: (ticketId: string) => void
  departments: Department[]
  users: BasicUser[]
  assigneeEligibleUsers: BasicUser[]
  updateTicketField: (ticketId: string, field: string, value: string | null | undefined) => Promise<void> | void
  updatingFields: Record<string, string>
  excludeDone: boolean
}

const TicketRow = memo(function TicketRow({
  ticket,
  onCopy,
  onSelectTicket,
  departments,
  users,
  assigneeEligibleUsers,
  updateTicketField,
  updatingFields,
  excludeDone,
}: TicketRowProps) {
  const requestedById = ticket.requested_by?.id || (ticket as any).requested_by_id

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="py-2 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => onCopy(ticket)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <span>{ticket.display_id || ticket.id.slice(0, 8)}</span>
        </div>
      </TableCell>
      <TableCell className="py-2 w-[400px] min-w-[300px]">
        <div className="flex flex-col gap-2">
          <div
            className="bg-transparent rounded-md p-2 hover:underline flex flex-col cursor-pointer"
            onClick={() => onSelectTicket(ticket.id)}
          >
            <span className="text-sm">{ticket.title}</span>
            <span className="text-xs text-muted-foreground line-clamp-2">
              {ticket.description || "No description"}
            </span>
          </div>
          <div className="bg-muted/50 rounded-md p-2 flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
              Created {formatRelativeDate(ticket.created_at)}
            </span>
            {ticket.project?.name && (
              <Link
                href={`/projects/${ticket.project.id}`}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Project: {ticket.project.name}
              </Link>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-2">
        <TicketTypeSelect
          value={ticket.type || "task"}
          onValueChange={(value) => updateTicketField(ticket.id, "type", value)}
          disabled={!!updatingFields[`${ticket.id}-type`]}
        />
      </TableCell>
      <TableCell className="py-2">
        <Select
          value={ticket.department?.id || NO_DEPARTMENT_VALUE}
          onValueChange={(value) =>
            updateTicketField(ticket.id, "department_id", value === NO_DEPARTMENT_VALUE ? null : value)
          }
          disabled={!!updatingFields[`${ticket.id}-department_id`]}
        >
          <SelectTrigger className="h-7 w-[140px] text-xs dark:bg-[#1f1f1f]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-[#1f1f1f]">
            <SelectItem value={NO_DEPARTMENT_VALUE}>No Department</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2">
        <TicketStatusSelect
          value={ticket.status}
          onValueChange={(value) => updateTicketField(ticket.id, "status", value)}
          disabled={!!updatingFields[`${ticket.id}-status`]}
          excludeDone={excludeDone}
        />
      </TableCell>
      <TableCell className="py-2">
        <TicketPrioritySelect
          value={ticket.priority}
          onValueChange={(value) => updateTicketField(ticket.id, "priority", value)}
          disabled={!!updatingFields[`${ticket.id}-priority`]}
        />
      </TableCell>
      <TableCell className="py-2">
        {ticket.links && ticket.links.length > 0 ? (
          <div className="flex flex-col gap-1">
            {ticket.links.slice(0, 2).map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
                onClick={(e) => e.stopPropagation()}
              >
                <Link2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{formatLinkLabel(url)}</span>
              </a>
            ))}
            {ticket.links.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{ticket.links.length - 2} more
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="py-2">
        <Select
          value={requestedById ?? undefined}
          onValueChange={(value) => updateTicketField(ticket.id, "requested_by_id", value)}
          disabled={!!updatingFields[`${ticket.id}-requested_by_id`]}
        >
          <SelectTrigger className="h-7 w-[150px] text-xs relative dark:bg-[#1f1f1f] overflow-hidden">
            {requestedById ? (
              <div className="absolute left-2 right-8 top-0 bottom-0 flex items-center overflow-hidden">
                <UserSelectValue users={users} value={requestedById} placeholder="Select user" />
              </div>
            ) : (
              <SelectValue placeholder="Select user" />
            )}
          </SelectTrigger>
          <SelectContent className="dark:bg-[#1f1f1f]">
            {users.map((user) => (
              <UserSelectItem key={user.id} user={user} value={user.id} className="text-xs" />
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2">
        <Select
          value={ticket.assignee?.id || UNASSIGNED_VALUE}
          onValueChange={(value) =>
            updateTicketField(ticket.id, "assignee_id", value === UNASSIGNED_VALUE ? null : value)
          }
          disabled={!!updatingFields[`${ticket.id}-assignee_id`]}
        >
          <SelectTrigger className="h-7 w-[150px] text-xs relative dark:bg-[#1f1f1f] overflow-hidden">
            {ticket.assignee?.id ? (
              <div className="absolute left-2 right-8 top-0 bottom-0 flex items-center overflow-hidden">
                <UserSelectValue
                  users={assigneeEligibleUsers}
                  value={ticket.assignee.id}
                  placeholder="Unassigned"
                  unassignedValue={UNASSIGNED_VALUE}
                  unassignedLabel="Unassigned"
                />
              </div>
            ) : (
              <SelectValue placeholder="Unassigned" />
            )}
          </SelectTrigger>
          <SelectContent className="dark:bg-[#1f1f1f]">
            <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
            {assigneeEligibleUsers.map((user) => (
              <UserSelectItem key={user.id} user={user} value={user.id} className="text-xs" />
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  )
})
