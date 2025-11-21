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
import { Copy, Plus, X, Check, Circle, LayoutGrid, Table2 } from "lucide-react"
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
import { GlobalTicketDialog } from "@/components/global-ticket-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import { TicketTypeIcon } from "@/components/ticket-type-select"
import { TicketPriorityIcon } from "@/components/ticket-priority-select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

const ASSIGNEE_ALLOWED_ROLES = new Set(["admin", "member"])
const ROWS_PER_PAGE = 20
const UNASSIGNED_VALUE = "unassigned"
const NO_DEPARTMENT_VALUE = "no_department"

const KANBAN_COLUMNS = [
  { id: "open", label: "Open", color: "fill-gray-500 text-gray-500" },
  { id: "in_progress", label: "In Progress", color: "fill-yellow-500 text-yellow-500" },
  { id: "blocked", label: "Blocked", color: "fill-purple-500 text-purple-500" },
  { id: "cancelled", label: "Cancelled", color: "fill-red-500 text-red-500" },
  { id: "completed", label: "Completed", color: "fill-green-500 text-green-500" },
]
const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  priority: "Priority",
  type: "Type",
  requested_by_id: "Requested By",
  assignee_id: "Assignee",
  department_id: "Department",
}

interface Ticket {
  id: string
  display_id: string | null
  title: string
  description: string | null
  status: string
  priority: string
  type: string
  links: string[]
  reason?: {
    cancelled?: {
      reason: string
      cancelledAt: string
    }
  } | null
  department: {
    id: string
    name: string
  } | null
  epic: {
    id: string
    name: string
    color: string
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
  const [addingToStatus, setAddingToStatus] = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isTicketDialogOpen, setTicketDialogOpen] = useState(false)
  const [showCancelReasonDialog, setShowCancelReasonDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [pendingStatusChange, setPendingStatusChange] = useState<{ ticketId: string; newStatus: string; body: any } | null>(null)
  const queryClient = useQueryClient()
  
  const { user, hasPermission } = usePermissions()
  const createTicket = useCreateTicket()
  const { preferences, updatePreferences, isUpdating: isUpdatingPreferences } = useUserPreferences()
  const [view, setView] = useState<"table" | "kanban">(preferences.tickets_view || "table")
  const [applyingView, setApplyingView] = useState<"table" | "kanban" | null>(null)
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{ columnId: string; ticketId: string | null; top: number } | null>(null)
  
  // Set default view from preferences
  useEffect(() => {
    if (preferences.tickets_view) {
      setView(preferences.tickets_view)
    }
  }, [preferences.tickets_view])
  
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

  const allTickets = useMemo(() => ticketsData || [], [ticketsData])
  const projects = useMemo(() => projectsData || [], [projectsData])
  const users = useMemo(() => usersData || [], [usersData])
  // Only show loading if we have no data at all
  const loading = !ticketsData && ticketsLoading
  const canCreateTickets = hasPermission("tickets", "create")

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

  // Group tickets by status for kanban
  const ticketsByStatus = useMemo(() => {
    const grouped: Record<string, typeof filteredTickets> = {
      open: [],
      in_progress: [],
      blocked: [],
      cancelled: [],
      completed: [],
    }
    filteredTickets.forEach(ticket => {
      if (grouped[ticket.status]) {
        grouped[ticket.status].push(ticket)
      }
    })
    return grouped
  }, [filteredTickets])

  useEffect(() => {
    if (filteredTickets.length === 0 && isAddingNew) {
      setIsAddingNew(false)
      setAddingToStatus(null)
    }
  }, [filteredTickets.length, isAddingNew])

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
          setAddingToStatus(null)
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
      if (isAddingNew || !hasPermission("tickets", "create") || filteredTickets.length === 0) return

      e.preventDefault()
      setIsAddingNew(true)
      if (view === "kanban") {
        setAddingToStatus("open") // Default to "open" status in kanban
      }
    }

    window.addEventListener("keydown", handleKeyDown, true) // Use capture phase
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [isAddingNew, hasPermission, filteredTickets.length, view])

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
      
      // If changing to cancelled, prompt for reason first
      if (newStatus === "cancelled" && previousStatus !== "cancelled") {
        // Build the body with all the status change logic
        body[field] = newStatus
        
        // Condition 2: When status from Open/Blocked to any other status then update started_at timestamp
        if (previousStatus === "open" || previousStatus === "blocked") {
          body.started_at = new Date().toISOString()
        }
        
        // Condition 3: When any status changed to Cancelled or Completed then update completed_at timestamp
        body.completed_at = new Date().toISOString()
        // Also ensure started_at is set if not already
        const ticketStartedAt = (currentTicket as any)?.started_at
        if (!ticketStartedAt) {
          body.started_at = new Date().toISOString()
        }
        
        // Store pending change and show dialog
        setPendingStatusChange({ ticketId, newStatus, body })
        setCancelReason("")
        setShowCancelReasonDialog(true)
        return
      }
      
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
        // Clear reason when moving away from cancelled
        body.reason = null
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

  // Drag and drop handlers for kanban
  const handleDragStart = useCallback((e: React.DragEvent, ticketId: string) => {
    if (!hasPermission("tickets", "edit")) return
    setDraggedTicket(ticketId)
    e.dataTransfer.effectAllowed = "move"
  }, [hasPermission])

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    if (!draggedTicket) return
    e.preventDefault()
    e.stopPropagation()
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    setDropIndicator({ columnId, ticketId: null, top: y })
  }, [draggedTicket])

  const handleDragLeave = useCallback(() => {
    setDropIndicator(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedTicket) return

    const ticket = allTickets.find(t => t.id === draggedTicket)
    if (!ticket || ticket.status === columnId) {
      setDraggedTicket(null)
      setDropIndicator(null)
      return
    }

    const previousStatus = ticket.status
    const newStatus = columnId
    const body: any = { status: newStatus }

    // Condition 1: If moving to cancelled, show cancel reason dialog
    if (newStatus === "cancelled") {
      body.completed_at = new Date().toISOString()
      // Also ensure started_at is set if not already
      const ticketStartedAt = (ticket as any)?.started_at
      if (!ticketStartedAt) {
        body.started_at = new Date().toISOString()
      }
      
      // Store pending change and show dialog
      setPendingStatusChange({ ticketId: draggedTicket, newStatus, body })
      setCancelReason("")
      setShowCancelReasonDialog(true)
      setDraggedTicket(null)
      setDropIndicator(null)
      return
    }

    // Condition 2: When status from Open/Blocked to any other status then update started_at timestamp
    if ((previousStatus === "open" || previousStatus === "blocked") && newStatus !== "open" && newStatus !== "blocked") {
      body.started_at = new Date().toISOString()
    }

    // Condition 3: When any status changed to Completed then update completed_at timestamp
    if (newStatus === "completed") {
      body.completed_at = new Date().toISOString()
      // Also ensure started_at is set if not already
      const ticketStartedAt = (ticket as any)?.started_at
      if (!ticketStartedAt) {
        body.started_at = new Date().toISOString()
      }
    }

    // Condition 4: If status changed from Completed/Cancelled to other status then remove timestamp completed_at
    if ((previousStatus === "completed" || previousStatus === "cancelled") && newStatus !== "completed" && newStatus !== "cancelled") {
      body.completed_at = null
      // Clear reason when moving away from cancelled
      body.reason = null
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

    try {
      await updateTicket.mutateAsync({
        id: draggedTicket,
        ...body,
      })
      toast("Ticket status updated")
    } catch (error: any) {
      toast(error.message || "Failed to update ticket", "error")
    } finally {
      setDraggedTicket(null)
      setDropIndicator(null)
    }
  }, [draggedTicket, allTickets, updateTicket])

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl">Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View and manage all tickets across projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={view === "table" ? "default" : "ghost"}
              size="sm"
              onClick={async () => {
                if (view === "table" || applyingView !== null) return
                const previousView = view
                setApplyingView("table")
                setView("table")
                try {
                  await updatePreferences({ tickets_view: "table" })
                  toast("View changed to Table")
                } catch (error) {
                  setView(previousView) // Revert on error
                  toast("Failed to change view", "error")
                } finally {
                  setApplyingView(null)
                }
              }}
              disabled={applyingView !== null}
              className="h-9 rounded-r-none"
            >
              {applyingView === "table" ? (
                <>
                  <span className="mr-2 inline-flex h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Applying...
                </>
              ) : (
                <>
                  <Table2 className="h-4 w-4 mr-2" />
                  Table
                </>
              )}
            </Button>
            <Button
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={async () => {
                if (view === "kanban" || applyingView !== null) return
                const previousView = view
                setApplyingView("kanban")
                setView("kanban")
                try {
                  await updatePreferences({ tickets_view: "kanban" })
                  toast("View changed to Kanban")
                } catch (error) {
                  setView(previousView) // Revert on error
                  toast("Failed to change view", "error")
                } finally {
                  setApplyingView(null)
                }
              }}
              disabled={applyingView !== null}
              className="h-9 rounded-l-none"
            >
              {applyingView === "kanban" ? (
                <>
                  <span className="mr-2 inline-flex h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Applying...
                </>
              ) : (
                <>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </>
              )}
            </Button>
          </div>
          {canCreateTickets && (
            <Button variant="outline" size="sm" onClick={() => setTicketDialogOpen(true)} className="h-9">
              <Plus className="mr-2 h-4 w-4" />
              Add Ticket
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        <Input
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-[256px] h-9 dark:bg-[#1f1f1f]"
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
        </div>
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4">
          {KANBAN_COLUMNS.map((column) => {
            const columnTickets = ticketsByStatus[column.id] || []
            
            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-80 flex flex-col"
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="bg-muted/30 rounded-lg p-3 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Circle className={`h-3 w-3 ${column.color}`} />
                      <h3 className="text-sm font-medium">{column.label}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {columnTickets.length}
                      </Badge>
                    </div>
                    {hasPermission("tickets", "create") && !isAddingNew && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setIsAddingNew(true)
                          setAddingToStatus(column.id)
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2 overflow-y-auto flex-1 min-h-0 relative">
                    {/* Drop indicator line */}
                    {dropIndicator?.columnId === column.id && (
                      <div 
                        className="absolute left-0 right-0 h-1 bg-primary z-10 pointer-events-none rounded-full shadow-sm"
                        style={{
                          top: `${dropIndicator.top}px`
                        }}
                      />
                    )}
                    {/* Quick add form for kanban */}
                    {isAddingNew && addingToStatus === column.id && canCreateTickets && (
                      <QuickAddKanbanCard
                        departments={departments}
                        users={users}
                        assigneeEligibleUsers={assigneeEligibleUsers}
                        onCancel={() => {
                          setIsAddingNew(false)
                          setAddingToStatus(null)
                        }}
                        onSubmit={async (formData) => {
                          await handleQuickAdd({ ...formData, status: column.id })
                          setIsAddingNew(false)
                          setAddingToStatus(null)
                        }}
                        defaultDepartmentId={departmentFilter !== "all" && departmentFilter !== "no_department" ? departmentFilter : undefined}
                        defaultAssigneeId={assigneeFilter !== "all" && assigneeFilter !== "unassigned" ? assigneeFilter : undefined}
                        defaultRequesterId={user?.id}
                      />
                    )}
                    {columnTickets.map((ticket) => (
                      <Card
                        key={ticket.id}
                        data-ticket-id={ticket.id}
                        className="p-3 bg-background hover:bg-muted/50 cursor-pointer transition-colors border shadow-sm"
                        draggable={hasPermission("tickets", "edit")}
                        onDragStart={(e) => handleDragStart(e, ticket.id)}
                        onClick={() => {
                          setSelectedTicketId(ticket.id)
                        }}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                {ticket.display_id && (
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {ticket.display_id}
                                  </span>
                                )}
                                <TicketTypeIcon type={ticket.type || "task"} />
                                <TicketPriorityIcon priority={ticket.priority} />
                              </div>
                              <h4 className="text-sm font-medium line-clamp-2 leading-tight">
                                {ticket.title}
                              </h4>
                            </div>
                          </div>
                          {ticket.assignee && (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={ticket.assignee.image || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {ticket.assignee.name?.[0]?.toUpperCase() || ticket.assignee.email[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground truncate">
                                {ticket.assignee.name || ticket.assignee.email}
                              </span>
                            </div>
                          )}
                          {ticket.department && (
                            <Badge variant="outline" className="text-xs">
                              {ticket.department.name}
                            </Badge>
                          )}
                          {ticket.project && (
                            <Badge variant="outline" className="text-xs">
                              {ticket.project.name}
                            </Badge>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto relative">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 z-20 bg-muted shadow-sm border-b [&_tr]:border-b">
                <tr className="hover:bg-transparent border-b">
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">ID</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground w-[400px] min-w-[300px]">Title</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Type</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Department</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Status</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Priority</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Requested By</th>
                  <th className="h-9 py-2 px-4 text-left align-middle text-xs text-muted-foreground">Assignee</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
              {isAddingNew && canCreateTickets && filteredTickets.length > 0 && (
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
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTickets.length)} of {filteredTickets.length} tickets
            </div>
            <div className="flex items-center space-x-2">
              {hasPermission("tickets", "create") && !isAddingNew && filteredTickets.length > 0 && (
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
      
      <GlobalTicketDialog open={isTicketDialogOpen && canCreateTickets} onOpenChange={setTicketDialogOpen} />
      <TicketDetailDialog
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicketId(null)
          }
        }}
      />
      <Dialog open={showCancelReasonDialog} onOpenChange={setShowCancelReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Ticket</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter cancellation reason..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelReasonDialog(false)
                setPendingStatusChange(null)
                setCancelReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!cancelReason.trim()) {
                  toast("Please provide a reason for cancellation", "error")
                  return
                }
                
                if (!pendingStatusChange) return
                
                const { ticketId, body } = pendingStatusChange
                const finalBody = {
                  ...body,
                  reason: { cancelled: { reason: cancelReason.trim(), cancelledAt: new Date().toISOString() } }
                }
                
                setShowCancelReasonDialog(false)
                setPendingStatusChange(null)
                
                const cellKey = `${ticketId}-status`
                setUpdatingFields(prev => ({ ...prev, [cellKey]: "status" }))
                
                try {
                  await updateTicket.mutateAsync({
                    id: ticketId,
                    ...finalBody,
                  })
                  toast("Status updated")
                } catch (error: any) {
                  toast(error.message || "Failed to update ticket", "error")
                } finally {
                  setUpdatingFields(prev => {
                    const newState = { ...prev }
                    delete newState[cellKey]
                    return newState
                  })
                }
                
                setCancelReason("")
              }}
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        <TableCell colSpan={8} className="py-2">
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

interface QuickAddKanbanCardProps {
  departments: Department[]
  users: BasicUser[]
  assigneeEligibleUsers: BasicUser[]
  onCancel: () => void
  onSubmit: (data: QuickAddTicketData) => Promise<void>
  defaultDepartmentId?: string
  defaultAssigneeId?: string
  defaultRequesterId?: string
}

const QuickAddKanbanCard = memo(function QuickAddKanbanCard({
  departments,
  users,
  assigneeEligibleUsers,
  onCancel,
  onSubmit,
  defaultDepartmentId,
  defaultAssigneeId,
  defaultRequesterId,
}: QuickAddKanbanCardProps) {
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
      setFormData({
        title: "",
        description: "",
        type: "task",
        priority: "medium",
        status: "open",
        department_id: defaultDepartmentId,
        assignee_id: defaultAssigneeId,
        requested_by_id: defaultRequesterId,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-3 bg-muted/50 border-dashed border-2">
      <div className="space-y-2">
        <Input
          placeholder="Title..."
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          className="h-7 text-sm dark:bg-[#1f1f1f]"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            } else if (e.key === "Escape") {
              e.preventDefault()
              onCancel()
            }
          }}
        />
        <Textarea
          placeholder="Description (optional)..."
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          className="min-h-[60px] text-xs dark:bg-[#1f1f1f]"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault()
              onCancel()
            }
          }}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <TicketTypeSelect
            value={formData.type}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as "bug" | "request" | "task" }))}
          />
          <TicketPrioritySelect
            value={formData.priority}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value as "low" | "medium" | "high" | "urgent" }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={formData.department_id || NO_DEPARTMENT_VALUE}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                department_id: value === NO_DEPARTMENT_VALUE ? undefined : value,
              }))
            }
          >
            <SelectTrigger className="h-7 flex-1 text-xs dark:bg-[#1f1f1f]">
              <SelectValue placeholder="Department" />
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
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs">
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={!formData.title.trim() || isSubmitting}
            className="h-7 text-xs"
          >
            {isSubmitting ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>
    </Card>
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
