"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { useRequirePermission } from "@/hooks/use-require-permission"
import { ArrowLeft, Link2, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/components/ui/toast"
import { Copy, Plus, X, Check, Circle, Pencil, Trash2 } from "lucide-react"
import { useProject, useUpdateProject } from "@/hooks/use-projects"
import { useTickets, useUpdateTicket, useCreateTicket } from "@/hooks/use-tickets"
import { useDepartments } from "@/hooks/use-departments"
import { useUsers } from "@/hooks/use-users"
import { useQueryClient } from "@tanstack/react-query"
import { UserSelectItem, UserSelectValue } from "@/components/user-select-item"
import { TicketTypeSelect, TicketTypeIcon } from "@/components/ticket-type-select"
import { TicketPrioritySelect, TicketPriorityIcon } from "@/components/ticket-priority-select"
import { TicketStatusSelect } from "@/components/ticket-status-select"
import { TicketDetailDialog } from "@/components/ticket-detail-dialog"

const ASSIGNEE_ALLOWED_ROLES = new Set(["admin", "member"])

const KANBAN_COLUMNS = [
  { id: "open", label: "Open", color: "fill-gray-500 text-gray-500" },
  { id: "in_progress", label: "In Progress", color: "fill-yellow-500 text-yellow-500" },
  { id: "blocked", label: "Blocked", color: "fill-purple-500 text-purple-500" },
  { id: "cancelled", label: "Cancelled", color: "fill-red-500 text-red-500" },
  { id: "completed", label: "Completed", color: "fill-green-500 text-green-500" },
]

export default function ProjectDetailPage() {
  // Require view permission for projects - redirects if not authorized
  const { hasPermission: canView, loading: permissionLoading } = useRequirePermission("projects", "view")
  const params = useParams()
  const projectId = params.projectId as string
  
  // All hooks must be called before any conditional returns
  const { data: projectData, isLoading: projectLoading } = useProject(projectId)
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets({
    project_id: projectId,
  })
  const { departments } = useDepartments()
  const { data: usersData } = useUsers()
  const updateTicket = useUpdateTicket()
  const updateProject = useUpdateProject()
  const { user, hasPermission } = usePermissions()
  const createTicket = useCreateTicket()
  const queryClient = useQueryClient()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [requestedByFilter, setRequestedByFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [excludeDone, setExcludeDone] = useState(true)
  const [updatingFields, setUpdatingFields] = useState<Record<string, string>>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [addingToStatus, setAddingToStatus] = useState<string | null>(null)
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{ columnId: string; ticketId: string | null; top: number } | null>(null)
  const [droppingTicketId, setDroppingTicketId] = useState<string | null>(null)
  const [optimisticStatusUpdates, setOptimisticStatusUpdates] = useState<Record<string, string>>({})
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [editingProjectLinkIndex, setEditingProjectLinkIndex] = useState<number | null>(null)
  const [newProjectLinkUrl, setNewProjectLinkUrl] = useState("")
  const [isAddingProjectLink, setIsAddingProjectLink] = useState(false)
  
  // Set default assignee filter to "My Tickets" when user is available (only once on initial load)
  useEffect(() => {
    if (user?.id && assigneeFilter === "all") {
      setAssigneeFilter(user.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const [newTicketData, setNewTicketData] = useState({
    title: "",
    description: "",
    type: "task" as "bug" | "request" | "task",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    status: "open" as string,
    department_id: undefined,
    assignee_id: assigneeFilter !== "all" && assigneeFilter !== "unassigned" ? assigneeFilter : undefined,
    requested_by_id: undefined as string | undefined,
  })

  // Update requested_by_id when user is available
  useEffect(() => {
    if (user?.id && !newTicketData.requested_by_id) {
      setNewTicketData(prev => ({ ...prev, requested_by_id: user.id }))
    }
  }, [user?.id])

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
      if (isAddingNew || !hasPermission("tickets", "create")) return

      e.preventDefault()
      setIsAddingNew(true)
      setAddingToStatus("open") // Default to "open" status
      setNewTicketData(prev => ({ ...prev, status: "open" }))
    }

    window.addEventListener("keydown", handleKeyDown, true) // Use capture phase
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [isAddingNew, hasPermission])

  // Derive data values (must be before any hooks that use them)
  const project = projectData?.project || null
  const allTickets = ticketsData || []
  const users = usersData || []
  const loading = (!projectData && projectLoading) || (!ticketsData && ticketsLoading)

  // All hooks must be called unconditionally before any early returns
  const assigneeEligibleUsers = useMemo(
    () => (usersData || []).filter((user) =>
      user.role ? ASSIGNEE_ALLOWED_ROLES.has(user.role.toLowerCase()) : false
    ),
    [usersData]
  )

  const UNASSIGNED_VALUE = "unassigned"
  const NO_DEPARTMENT_VALUE = "no_department"
  const FIELD_LABELS: Record<string, string> = {
    status: "Status",
    priority: "Priority",
    type: "Type",
    requested_by_id: "Requested By",
    assignee_id: "Assignee",
    department_id: "Department",
  }

  const getUserById = (id?: string | null) => {
    if (!id) return undefined
    return users.find((user) => user.id === id)
  }

  // Client-side filtering for instant responsiveness with optimistic updates
  const filteredTickets = useMemo(() => {
    return allTickets.map(ticket => {
      // Apply optimistic status update if exists
      if (optimisticStatusUpdates[ticket.id]) {
        return { ...ticket, status: optimisticStatusUpdates[ticket.id] }
      }
      return ticket
    }).filter((ticket) => {
      // Search filter
      const matchesSearch = 
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.display_id?.toLowerCase().includes(searchQuery.toLowerCase())
      
      if (!matchesSearch) return false

      // Exclude done filter
      if (excludeDone && (ticket.status === "completed" || ticket.status === "cancelled")) {
        return false
      }

      // Requested by filter
      if (requestedByFilter !== "all" && ticket.requested_by?.id !== requestedByFilter) return false

      // Assignee filter
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned" && ticket.assignee?.id) return false
        if (assigneeFilter !== "unassigned" && ticket.assignee?.id !== assigneeFilter) return false
      }

      return true
    })
  }, [allTickets, searchQuery, excludeDone, requestedByFilter, assigneeFilter, optimisticStatusUpdates])

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

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    if (!hasPermission("tickets", "edit")) {
      e.preventDefault()
      return
    }
    
    // Prevent dragging if ticket is currently being updated or dropped
    const isUpdating = Object.keys(updatingFields).some(key => key.startsWith(`${ticketId}-`))
    if (isUpdating || droppingTicketId === ticketId) {
      e.preventDefault()
      return
    }
    
    setDraggedTicket(ticketId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.dropEffect = "move"
    
    // Create a custom drag image
    const dragElement = e.currentTarget as HTMLElement
    const rect = dragElement.getBoundingClientRect()
    const dragImage = dragElement.cloneNode(true) as HTMLElement
    dragImage.style.width = `${rect.width}px`
    dragImage.style.opacity = "0.8"
    dragImage.style.transform = "rotate(3deg)"
    dragImage.style.pointerEvents = "none"
    document.body.appendChild(dragImage)
    dragImage.style.position = "absolute"
    dragImage.style.top = "-1000px"
    e.dataTransfer.setDragImage(dragImage, rect.width / 2, rect.height / 2)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragEnd = () => {
    // Only clear drag state if we're not in the middle of a drop operation
    if (!droppingTicketId) {
      setDraggedTicket(null)
      setDragOverColumn(null)
      setDropIndicator(null)
    }
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    if (!draggedTicket) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverColumn(columnId)
    
    // Calculate drop position based on mouse Y position
    const columnElement = e.currentTarget as HTMLElement
    const scrollContainer = columnElement.querySelector('.space-y-2') as HTMLElement
    if (!scrollContainer) return
    
    const containerRect = scrollContainer.getBoundingClientRect()
    const mouseY = e.clientY - containerRect.top + scrollContainer.scrollTop
    
    // Find the ticket card that the mouse is over
    const ticketCards = scrollContainer.querySelectorAll('[data-ticket-id]')
    let dropTicketId: string | null = null
    let indicatorTop = 0
    
    if (ticketCards.length === 0) {
      // Empty column, show line at top
      indicatorTop = 0
      dropTicketId = null
    } else {
      for (let i = 0; i < ticketCards.length; i++) {
        const card = ticketCards[i] as HTMLElement
        const cardTop = card.offsetTop
        const cardHeight = card.offsetHeight
        const cardBottom = cardTop + cardHeight
        
        // If mouse is in the upper half of a card, drop before it
        if (mouseY >= cardTop && mouseY < cardTop + (cardHeight / 2)) {
          dropTicketId = card.getAttribute('data-ticket-id')
          indicatorTop = cardTop - 4 // 4px is half spacing (space-y-2 = 8px)
          break
        }
        // If mouse is in the lower half, drop after it
        if (mouseY >= cardTop + (cardHeight / 2) && mouseY < cardBottom) {
          // Check if there's a next card, otherwise drop at the end
          if (i < ticketCards.length - 1) {
            const nextCard = ticketCards[i + 1] as HTMLElement
            dropTicketId = nextCard.getAttribute('data-ticket-id')
            indicatorTop = nextCard.offsetTop - 4
          } else {
            // Drop at the end
            dropTicketId = null
            indicatorTop = cardBottom + 4
          }
          break
        }
      }
      
      // If mouse is above all cards, drop at the top
      if (dropTicketId === null && ticketCards.length > 0 && mouseY < (ticketCards[0] as HTMLElement).offsetTop) {
        const firstCard = ticketCards[0] as HTMLElement
        dropTicketId = firstCard.getAttribute('data-ticket-id')
        indicatorTop = firstCard.offsetTop - 4
      }
    }
    
    setDropIndicator({ columnId, ticketId: dropTicketId, top: indicatorTop })
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the column area, not entering a child
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null)
      setDropIndicator(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    if (!draggedTicket) return

    const ticketId = draggedTicket

    // Prevent drop if already updating or dropping
    const isUpdating = Object.keys(updatingFields).some(key => key.startsWith(`${ticketId}-`))
    if (isUpdating || droppingTicketId === ticketId) {
      setDraggedTicket(null)
      setDragOverColumn(null)
      setDropIndicator(null)
      return
    }

    // Get current ticket to preserve its status for rollback
    const currentTicket = allTickets.find(t => t.id === ticketId)
    const previousStatus = currentTicket?.status

    // Cancel move if dropping in the same status column
    if (previousStatus === targetStatus) {
      setDraggedTicket(null)
      setDragOverColumn(null)
      setDropIndicator(null)
      return
    }

    // Apply optimistic update immediately - ticket appears in new column right away
    setOptimisticStatusUpdates(prev => ({ ...prev, [ticketId]: targetStatus }))
    
    // Set dropping state for this specific ticket
    setDroppingTicketId(ticketId)
    setDragOverColumn(null)
    
    // Mark the ticket as updating
    setUpdatingFields(prev => ({ ...prev, [`${ticketId}-status`]: "status" }))

    // Build update body with timestamp logic
    const updates: any = { status: targetStatus }
    
    // Condition 2: When status from Open/Blocked to any other status then update started_at timestamp
    if ((previousStatus === "open" || previousStatus === "blocked") && targetStatus !== "open" && targetStatus !== "blocked") {
      updates.started_at = new Date().toISOString()
    }
    
    // Condition 3: When any status changed to Cancelled or Completed then update completed_at timestamp
    if (targetStatus === "completed" || targetStatus === "cancelled") {
      updates.completed_at = new Date().toISOString()
      // Also ensure started_at is set if not already
      if (!currentTicket?.started_at) {
        updates.started_at = new Date().toISOString()
      }
    }
    
    // Condition 4: If status changed from Completed/Cancelled to other status then remove timestamp completed_at
    if ((previousStatus === "completed" || previousStatus === "cancelled") && targetStatus !== "completed" && targetStatus !== "cancelled") {
      updates.completed_at = null
    }
    
    // Condition 5: If status changed from In Progress to Blocked or Open then remove timestamp started_at
    if (previousStatus === "in_progress" && (targetStatus === "blocked" || targetStatus === "open")) {
      updates.started_at = null
    }
    
    // Additional: If status is open, clear started_at and completed_at
    if (targetStatus === "open") {
      updates.started_at = null
      updates.completed_at = null
    }

    try {
      await updateTicket.mutateAsync({
        id: ticketId,
        ...updates,
      })
      toast("Ticket status updated")
      
      // Clear optimistic update after a short delay to allow real-time update to take over
      setTimeout(() => {
        setOptimisticStatusUpdates(prev => {
          const newState = { ...prev }
          delete newState[ticketId]
          return newState
        })
      }, 500)
      
      // Clear states immediately
      setDroppingTicketId(null)
      setDraggedTicket(null)
      setDragOverColumn(null)
      setDropIndicator(null)
      setUpdatingFields(prev => {
        const newState = { ...prev }
        delete newState[`${ticketId}-status`]
        return newState
      })
    } catch (error: any) {
      toast(error.message || "Failed to update ticket", "error")
      
      // Rollback optimistic update on error
      setOptimisticStatusUpdates(prev => {
        const newState = { ...prev }
        delete newState[ticketId]
        return newState
      })
      
      setDroppingTicketId(null)
      setDraggedTicket(null)
      setDragOverColumn(null)
      setDropIndicator(null)
      setUpdatingFields(prev => {
        const newState = { ...prev }
        delete newState[`${ticketId}-status`]
        return newState
      })
    }
  }

  const handleQuickAdd = async () => {
    if (!newTicketData.title.trim()) {
      toast("Title is required", "error")
      return
    }

    try {
      await createTicket.mutateAsync({
        title: newTicketData.title,
        description: newTicketData.description || undefined,
        type: newTicketData.type,
        priority: newTicketData.priority,
        project_id: projectId,
        department_id: newTicketData.department_id || undefined,
        assignee_id: newTicketData.assignee_id || undefined,
        requested_by_id: newTicketData.requested_by_id || user?.id,
        status: addingToStatus || newTicketData.status,
      })
      toast("Ticket created successfully")
      setIsAddingNew(false)
      setNewTicketData({
        title: "",
        description: "",
        type: "task",
        priority: "medium",
        status: addingToStatus || "open",
        department_id: undefined,
        assignee_id: assigneeFilter !== "all" && assigneeFilter !== "unassigned" ? assigneeFilter : undefined,
        requested_by_id: undefined,
      })
      setAddingToStatus(null)
    } catch (error: any) {
      toast(error.message || "Failed to create ticket", "error")
    }
  }

  const handleCopyTicketLabel = (ticket: any) => {
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
  }

  const updateTicketField = async (
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
  }

  const formatLinkLabel = (url: string) => {
    try {
      const { hostname } = new URL(url)
      return hostname.replace(/^www\./, "")
    } catch {
      return url
    }
  }

  const handleAddProjectLink = async () => {
    if (!project || !newProjectLinkUrl.trim()) return
    
    try {
      const url = newProjectLinkUrl.trim()
      // Basic URL validation
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        toast("URL must start with http:// or https://", "error")
        return
      }
      
      const currentLinks = project.links || []
      const updatedLinks = [...currentLinks, url]
      
      await updateProject.mutateAsync({
        id: projectId,
        links: updatedLinks,
      })
      toast("Link added")
      setIsAddingProjectLink(false)
      setNewProjectLinkUrl("")
    } catch (error: any) {
      toast(error.message || "Failed to add link", "error")
    }
  }

  const handleUpdateProjectLink = async (index: number) => {
    if (!project || !newProjectLinkUrl.trim()) return
    
    try {
      const url = newProjectLinkUrl.trim()
      // Basic URL validation
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        toast("URL must start with http:// or https://", "error")
        return
      }
      
      const currentLinks = [...(project.links || [])]
      currentLinks[index] = url
      
      await updateProject.mutateAsync({
        id: projectId,
        links: currentLinks,
      })
      toast("Link updated")
      setEditingProjectLinkIndex(null)
      setNewProjectLinkUrl("")
    } catch (error: any) {
      toast(error.message || "Failed to update link", "error")
    }
  }

  const handleRemoveProjectLink = async (index: number) => {
    if (!project) return
    
    try {
      const currentLinks = [...(project.links || [])]
      currentLinks.splice(index, 1)
      
      await updateProject.mutateAsync({
        id: projectId,
        links: currentLinks,
      })
      toast("Link removed")
    } catch (error: any) {
      toast(error.message || "Failed to remove link", "error")
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (!project) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">Project not found</p>
        <Button asChild className="mt-4">
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-4">
      <div className="flex items-center space-x-4 flex-shrink-0">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <nav className="text-sm text-muted-foreground">
          <Link href="/projects" className="hover:underline">
            Projects
          </Link>
          <span className="mx-2">/</span>
          <span>{project.name}</span>
        </nav>
      </div>

      <div className="flex items-center space-x-2 flex-wrap gap-y-2 flex-shrink-0">
        <Input
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm h-9"
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
        <Select value={requestedByFilter} onValueChange={setRequestedByFilter}>
          <SelectTrigger className="w-[140px] h-9 relative">
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
          <SelectContent>
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
          />
          <Label
            htmlFor="exclude-done"
            className="text-sm font-normal cursor-pointer whitespace-nowrap"
          >
            Exclude Done
          </Label>
        </div>
      </div>

      <Card className="p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold">Project Links</h2>
            <p className="text-xs text-muted-foreground">Attach design docs, specs, or shared folders.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {project.links?.length || 0} link{project.links?.length === 1 ? "" : "s"}
            </Badge>
            {hasPermission("projects", "edit") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingProjectLink(true)
                  setNewProjectLinkUrl("")
                }}
                className="h-7 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add URL
              </Button>
            )}
          </div>
        </div>
        {isAddingProjectLink && (
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="https://example.com"
              value={newProjectLinkUrl}
              onChange={(e) => setNewProjectLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddProjectLink()
                } else if (e.key === "Escape") {
                  setIsAddingProjectLink(false)
                  setNewProjectLinkUrl("")
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddProjectLink}
              disabled={!newProjectLinkUrl.trim()}
            >
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingProjectLink(false)
                setNewProjectLinkUrl("")
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {project.links?.length ? (
          <div className="space-y-2">
            {project.links.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                {editingProjectLinkIndex === index ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={newProjectLinkUrl}
                      onChange={(e) => setNewProjectLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateProjectLink(index)
                        } else if (e.key === "Escape") {
                          setEditingProjectLinkIndex(null)
                          setNewProjectLinkUrl("")
                        }
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUpdateProjectLink(index)}
                      disabled={!newProjectLinkUrl.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingProjectLinkIndex(null)
                        setNewProjectLinkUrl("")
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 min-w-0 flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{url}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{formatLinkLabel(url)}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                    </a>
                    {hasPermission("projects", "edit") && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingProjectLinkIndex(index)
                            setNewProjectLinkUrl(url)
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProjectLink(index)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          !isAddingProjectLink && (
            <p className="text-sm text-muted-foreground">No links added yet.</p>
          )
        )}
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Kanban Board */}
          <div className="flex gap-4 overflow-x-auto overflow-y-hidden flex-1">
            {KANBAN_COLUMNS.map((column) => {
              const columnTickets = ticketsByStatus[column.id] || []
              const isAddingToThisColumn = isAddingNew && addingToStatus === column.id
              
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
                            setNewTicketData(prev => ({ ...prev, status: column.id }))
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
                      {isAddingToThisColumn && (
                        <Card className="p-4 bg-background border-2 border-dashed border-primary/20 shadow-sm">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-foreground">New Ticket</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-muted"
                                onClick={() => {
                                  setIsAddingNew(false)
                                  setAddingToStatus(null)
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="space-y-2.5">
                              <Input
                                placeholder="Ticket title..."
                                value={newTicketData.title}
                                onChange={(e) => setNewTicketData({ ...newTicketData, title: e.target.value })}
                                className="h-9 text-sm font-medium"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    handleQuickAdd()
                                  } else if (e.key === "Escape") {
                                    setIsAddingNew(false)
                                    setAddingToStatus(null)
                                  }
                                }}
                              />
                              <Textarea
                                placeholder="Description (optional)..."
                                value={newTicketData.description}
                                onChange={(e) => setNewTicketData({ ...newTicketData, description: e.target.value })}
                                className="min-h-[60px] text-xs resize-none"
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") {
                                    setIsAddingNew(false)
                                    setAddingToStatus(null)
                                  }
                                }}
                              />
                            </div>
                            
                            <div className="flex gap-2 flex-wrap">
                              <TicketTypeSelect
                                value={newTicketData.type}
                                onValueChange={(value) => setNewTicketData({ ...newTicketData, type: value as "bug" | "request" | "task" })}
                              />
                              <TicketPrioritySelect
                                value={newTicketData.priority}
                                onValueChange={(value) => setNewTicketData({ ...newTicketData, priority: value as "low" | "medium" | "high" | "urgent" })}
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <Select
                                value={newTicketData.assignee_id || UNASSIGNED_VALUE}
                                onValueChange={(value) =>
                                  setNewTicketData({
                                    ...newTicketData,
                                    assignee_id: value === UNASSIGNED_VALUE ? undefined : value,
                                  })
                                }
                              >
                                <SelectTrigger className="h-8 text-xs flex-1">
                                  <SelectValue placeholder="Assignee" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                                  {users.map((user) => (
                                    <UserSelectItem key={user.id} user={user} value={user.id} className="text-xs" />
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={newTicketData.requested_by_id || ""}
                                onValueChange={(value) =>
                                  setNewTicketData({
                                    ...newTicketData,
                                    requested_by_id: value || undefined,
                                  })
                                }
                              >
                                <SelectTrigger className="h-8 text-xs flex-1">
                                  <SelectValue placeholder="Requested by" />
                                </SelectTrigger>
                                <SelectContent>
                                  {users.map((user) => (
                                    <UserSelectItem key={user.id} user={user} value={user.id} className="text-xs" />
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex gap-2 pt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-8"
                                onClick={() => {
                                  setIsAddingNew(false)
                                  setAddingToStatus(null)
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 h-8"
                                onClick={handleQuickAdd}
                                disabled={!newTicketData.title.trim()}
                              >
                                <Check className="h-3.5 w-3.5 mr-1.5" />
                                Create
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )}
                      
                      {columnTickets.map((ticket) => {
                        const isUpdating = Object.keys(updatingFields).some(key => key.startsWith(`${ticket.id}-`))
                        const isDroppingThis = droppingTicketId === ticket.id
                        const canDrag = hasPermission("tickets", "edit") && !isUpdating && !isDroppingThis
                        
                        return (
                          <Card
                            key={ticket.id}
                            data-ticket-id={ticket.id}
                            draggable={canDrag}
                            onDragStart={(e) => handleDragStart(e, ticket.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => {
                              if (!draggedTicket || draggedTicket === ticket.id) return
                              e.preventDefault()
                              e.stopPropagation()
                              const card = e.currentTarget as HTMLElement
                              const container = card.closest('.space-y-2') as HTMLElement
                              if (!container) return
                              
                              const containerRect = container.getBoundingClientRect()
                              const mouseY = e.clientY - containerRect.top + container.scrollTop
                              const cardTop = card.offsetTop
                              const cardHeight = card.offsetHeight
                              
                              // Determine if drop is before or after this card
                              if (mouseY < cardTop + (cardHeight / 2)) {
                                // Drop before this card
                                setDropIndicator({ 
                                  columnId: column.id, 
                                  ticketId: ticket.id, 
                                  top: cardTop - 4 
                                })
                              } else {
                                // Drop after this card
                                const nextCard = card.nextElementSibling as HTMLElement
                                if (nextCard && nextCard.hasAttribute('data-ticket-id')) {
                                  setDropIndicator({ 
                                    columnId: column.id, 
                                    ticketId: nextCard.getAttribute('data-ticket-id'), 
                                    top: nextCard.offsetTop - 4 
                                  })
                                } else {
                                  setDropIndicator({ 
                                    columnId: column.id, 
                                    ticketId: null, 
                                    top: cardTop + cardHeight + 4 
                                  })
                                }
                              }
                            }}
                            className={`p-3 ${
                              isUpdating || isDroppingThis
                                ? "cursor-not-allowed opacity-50"
                                : canDrag
                                ? "cursor-move"
                                : "cursor-default"
                            } ${
                              draggedTicket === ticket.id 
                                ? "opacity-30" 
                                : draggedTicket && draggedTicket !== ticket.id
                                ? "opacity-60"
                                : "opacity-100"
                            }`}
                          >
                          <div 
                            className="space-y-2 cursor-pointer"
                            onClick={() => setSelectedTicketId(ticket.id)}
                          >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-4 w-4 flex-shrink-0 -ml-1"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleCopyTicketLabel(ticket)
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <span className="text-xs font-mono text-muted-foreground">
                                      {ticket.display_id || ticket.id.slice(0, 8)}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-medium line-clamp-2">{ticket.title}</h4>
                                  {ticket.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                      {ticket.description}
                                    </p>
                                  )}
                                  {ticket.links?.length ? (
                                    <a
                                      href={ticket.links[0]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <Link2 className="h-3 w-3" />
                                      <span className="truncate">{formatLinkLabel(ticket.links[0])}</span>
                                      {ticket.links.length > 1 && (
                                        <span className="text-[10px] font-medium">
                                          +{ticket.links.length - 1}
                                        </span>
                                      )}
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  {ticket.assignee && (
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={ticket.assignee.image || ""} />
                                      <AvatarFallback className="text-xs">
                                        {ticket.assignee.name?.charAt(0).toUpperCase() || "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <TicketTypeIcon type={ticket.type || "task"} />
                                    {ticket.type || "task"}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <TicketPriorityIcon priority={ticket.priority} />
                                    {ticket.priority}
                                  </Badge>
                                </div>
                                {ticket.department && (
                                  <Badge variant="outline" className="text-xs">
                                    {ticket.department.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                      
                      {columnTickets.length === 0 && !isAddingToThisColumn && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          No tickets
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {filteredTickets.length === 0 && !isAddingNew && (
            <div className="text-center py-8 text-sm text-muted-foreground flex-shrink-0">
              {searchQuery ? "No tickets found" : "No tickets yet."}
            </div>
          )}
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

