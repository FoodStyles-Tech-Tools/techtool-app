"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { ExternalLink } from "lucide-react"
import { BrandLinkIcon } from "@/components/brand-link-icon"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/components/ui/toast"
import {
  Copy,
  Plus,
  X,
  Circle,
  Link2,
  Pencil,
  Trash2,
  Pin,
  LayoutGrid,
  BarChart3,
  ListFilter,
  Search,
} from "lucide-react"
import { useProject, useUpdateProject } from "@/hooks/use-projects"
import { useTickets, useUpdateTicket } from "@/hooks/use-tickets"
import { useUsers } from "@/hooks/use-users"
import { UserSelectItem, UserSelectValue } from "@/components/user-select-item"
import { TicketTypeIcon } from "@/components/ticket-type-select"
import { TicketPriorityIcon } from "@/components/ticket-priority-select"
import { useTicketStatuses } from "@/hooks/use-ticket-statuses"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useEpics } from "@/hooks/use-epics"
import { EpicForm } from "@/components/forms/epic-form"
import { useSprints, type Sprint } from "@/hooks/use-sprints"
import { SprintForm } from "@/components/forms/sprint-form"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"

const TicketDetailDialog = dynamic(
  () => import("@/components/ticket-detail-dialog").then((mod) => mod.TicketDetailDialog),
  { ssr: false }
)
const GanttChart = dynamic(
  () => import("@/components/gantt-chart").then((mod) => mod.GanttChart),
  { ssr: false }
)
const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor").then((mod) => mod.RichTextEditor),
  { ssr: false }
)
import { filterStatusesBySqaRequirement, isDoneStatus } from "@/lib/ticket-statuses"
import { ASSIGNEE_ALLOWED_ROLES } from "@/lib/ticket-constants"
import type { Ticket } from "@/lib/types"
import { isRichTextEmpty, normalizeRichTextInput, richTextToPlainText } from "@/lib/rich-text"

export default function ProjectDetailClient() {
  const params = useParams()
  const projectId = params.projectId as string
  
  // All hooks must be called before any conditional returns
  const { data: projectData, isLoading: projectLoading } = useProject(projectId)
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets({
    project_id: projectId,
  })
  const { data: usersData } = useUsers()
  const { epics } = useEpics(projectId)
  const { sprints } = useSprints(projectId)
  const updateTicket = useUpdateTicket()
  const updateProject = useUpdateProject()
  const { user, flags } = usePermissions()
  const canCreateTickets = flags?.canCreateTickets ?? false
  const canEditTickets = flags?.canEditTickets ?? false
  const canEditProjects = flags?.canEditProjects ?? false
  const { preferences, updatePreferences, isUpdating: isUpdatingPreferences } = useUserPreferences()
  const { statuses: ticketStatuses } = useTicketStatuses()
  const groupByEpicInitialized = useRef(false)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [requestedByFilter, setRequestedByFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [excludeDone, setExcludeDone] = useState(true)
  const [groupByEpic, setGroupByEpic] = useState(false)
  const [viewMode, setViewMode] = useState<"kanban" | "gantt">("kanban")
  const [updatingFields, setUpdatingFields] = useState<Record<string, string>>({})
  const [isEpicDialogOpen, setIsEpicDialogOpen] = useState(false)
  const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false)
  const [editingSprint, setEditingSprint] = useState<Pick<Sprint, "id" | "name" | "description" | "status" | "start_date" | "end_date"> | null>(null)
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{ 
    columnId?: string; 
    epicId?: string; 
    statusId?: string; 
    ticketId: string | null; 
    top: number 
  } | null>(null)
  const [droppingTicketId, setDroppingTicketId] = useState<string | null>(null)
  const [justDroppedTicketId, setJustDroppedTicketId] = useState<string | null>(null)
  const [optimisticStatusUpdates, setOptimisticStatusUpdates] = useState<Record<string, string>>({})
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [editingProjectLinkIndex, setEditingProjectLinkIndex] = useState<number | null>(null)
  const [newProjectLinkUrl, setNewProjectLinkUrl] = useState("")
  const [isAddingProjectLink, setIsAddingProjectLink] = useState(false)
  const [showCancelReasonDialog, setShowCancelReasonDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [showReturnedReasonDialog, setShowReturnedReasonDialog] = useState(false)
  const [returnedReason, setReturnedReason] = useState("")
  const [pendingDropTicketId, setPendingDropTicketId] = useState<string | null>(null)
  const [pendingDropUpdates, setPendingDropUpdates] = useState<any>(null)
  const [pendingReturnedDropTicketId, setPendingReturnedDropTicketId] = useState<string | null>(null)
  const [pendingReturnedDropUpdates, setPendingReturnedDropUpdates] = useState<any>(null)
  const [sprintFilter, setSprintFilter] = useState<string>("all")
  const [kanbanScrollTrackWidth, setKanbanScrollTrackWidth] = useState(0)
  const kanbanScrollRef = useRef<HTMLDivElement>(null)
  const kanbanTopScrollRef = useRef<HTMLDivElement>(null)
  const kanbanSyncingRef = useRef<"top" | "board" | null>(null)
  const autoScrollVelocityRef = useRef(0)
  const autoScrollFrameRef = useRef<number | null>(null)
  
  // Set default filters based on user role
  useEffect(() => {
    if (user?.id && user?.role) {
      const userRole = user.role.toLowerCase()
      const isAdminOrMember = userRole === "admin" || userRole === "member"
      
      // If user is not Admin or Member, set defaults
      if (!isAdminOrMember) {
        if (assigneeFilter === "all") {
          setAssigneeFilter("all")
        }
        if (requestedByFilter === "all") {
          setRequestedByFilter(user.id)
        }
      } else {
        // Admin/Member: default to "My Tickets"
        if (assigneeFilter === "all") {
          setAssigneeFilter(user.id)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role])

  // Set default groupByEpic from user preferences (only once on initial load)
  useEffect(() => {
    if (!groupByEpicInitialized.current && preferences.group_by_epic !== undefined) {
      setGroupByEpic(preferences.group_by_epic)
      groupByEpicInitialized.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences.group_by_epic])

  // Derive data values (must be before any hooks that use them)
  const project = projectData?.project || null
  const allTickets = useMemo(() => (ticketsData || []) as Ticket[], [ticketsData])
  const users = usersData || []
  const loading = (!projectData && projectLoading) || (!ticketsData && ticketsLoading)

  // All hooks must be called unconditionally before any early returns
  const assigneeEligibleUsers = useMemo(
    () => (usersData || []).filter((user) =>
      user.role ? ASSIGNEE_ALLOWED_ROLES.has(user.role.toLowerCase()) : false
    ),
    [usersData]
  )

  const FIELD_LABELS: Record<string, string> = {
    status: "Status",
    priority: "Priority",
    type: "Type",
    requested_by_id: "Requested By",
    assignee_id: "Assignee",
    department_id: "Department",
  }
  const visibleTicketStatuses = useMemo(
    () => filterStatusesBySqaRequirement(ticketStatuses, project?.require_sqa === true),
    [project?.require_sqa, ticketStatuses]
  )
  const kanbanColumns = useMemo(
    () =>
      visibleTicketStatuses.map((status) => ({
        id: status.key,
        label: status.label,
        color: status.color,
      })),
    [visibleTicketStatuses]
  )
  const statusKeys = useMemo(
    () => kanbanColumns.map((column) => column.id),
    [kanbanColumns]
  )

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
      const descriptionText = richTextToPlainText(ticket.description)
      const matchesSearch = 
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        descriptionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.display_id?.toLowerCase().includes(searchQuery.toLowerCase())
      
      if (!matchesSearch) return false

      // Exclude done filter
      if (excludeDone && isDoneStatus(ticket.status)) {
        return false
      }

      // Requested by filter
      if (requestedByFilter !== "all" && ticket.requested_by?.id !== requestedByFilter) return false

      // Assignee filter
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned" && ticket.assignee?.id) return false
        if (assigneeFilter !== "unassigned" && ticket.assignee?.id !== assigneeFilter) return false
      }

      // Sprint filter
      if (sprintFilter !== "all") {
        if (sprintFilter === "no_sprint" && ticket.sprint?.id) return false
        if (sprintFilter !== "no_sprint" && ticket.sprint?.id !== sprintFilter) return false
      }

      return true
    })
  }, [allTickets, searchQuery, excludeDone, requestedByFilter, assigneeFilter, sprintFilter, optimisticStatusUpdates])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count += 1
    if (requestedByFilter !== "all") count += 1
    if (assigneeFilter !== "all") count += 1
    if (sprintFilter !== "all") count += 1
    if (!excludeDone) count += 1
    if (viewMode === "kanban" && groupByEpic) count += 1
    return count
  }, [searchQuery, requestedByFilter, assigneeFilter, sprintFilter, excludeDone, viewMode, groupByEpic])

  const resetProjectTicketFilters = useCallback(() => {
    setSearchQuery("")
    setRequestedByFilter("all")
    setAssigneeFilter("all")
    setSprintFilter("all")
    setExcludeDone(true)
    setGroupByEpic(false)
  }, [])

  // Group tickets by status for kanban
  const ticketsByStatus = useMemo(() => {
    const grouped: Record<string, typeof filteredTickets> = statusKeys.reduce(
      (acc, key) => {
        acc[key] = []
        return acc
      },
      {} as Record<string, typeof filteredTickets>
    )
    filteredTickets.forEach(ticket => {
      if (grouped[ticket.status]) {
        grouped[ticket.status].push(ticket)
      }
    })
    return grouped
  }, [filteredTickets, statusKeys])

  // Group tickets by epic, then by status
  const ticketsByEpic = useMemo(() => {
    const epicGroups: Record<string, Record<string, typeof filteredTickets>> = {}
    const createStatusBuckets = () =>
      statusKeys.reduce((acc, key) => {
        acc[key] = []
        return acc
      }, {} as Record<string, typeof filteredTickets>)
    
    // Initialize "No Epic" group
    epicGroups["no_epic"] = createStatusBuckets()
    
    // Initialize epic groups
    epics.forEach(epic => {
      epicGroups[epic.id] = createStatusBuckets()
    })
    
    // Group tickets
    filteredTickets.forEach(ticket => {
      const epicKey = ticket.epic?.id || "no_epic"
      const status = ticket.status
      
      if (!epicGroups[epicKey]) {
        epicGroups[epicKey] = createStatusBuckets()
      }
      
      if (epicGroups[epicKey][status]) {
        epicGroups[epicKey][status].push(ticket)
      }
    })
    
    return epicGroups
  }, [filteredTickets, epics, statusKeys])

  const triggerCardLanding = useCallback((ticketId: string) => {
    setJustDroppedTicketId(ticketId)
    window.setTimeout(() => {
      setJustDroppedTicketId((prev) => (prev === ticketId ? null : prev))
    }, 550)
  }, [])

  const syncKanbanScroll = useCallback((source: "top" | "board", scrollLeft: number) => {
    if (kanbanSyncingRef.current && kanbanSyncingRef.current !== source) return
    kanbanSyncingRef.current = source

    if (source === "top") {
      if (kanbanScrollRef.current) {
        kanbanScrollRef.current.scrollLeft = scrollLeft
      }
    } else {
      if (kanbanTopScrollRef.current) {
        kanbanTopScrollRef.current.scrollLeft = scrollLeft
      }
    }

    window.requestAnimationFrame(() => {
      if (kanbanSyncingRef.current === source) {
        kanbanSyncingRef.current = null
      }
    })
  }, [])

  const refreshKanbanTrackWidth = useCallback(() => {
    const container = kanbanScrollRef.current
    if (!container) return
    setKanbanScrollTrackWidth(container.scrollWidth)
  }, [])

  const stopAutoScroll = useCallback(() => {
    autoScrollVelocityRef.current = 0
    if (autoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(autoScrollFrameRef.current)
      autoScrollFrameRef.current = null
    }
  }, [])

  const runAutoScroll = useCallback(() => {
    const container = kanbanScrollRef.current
    if (!container || !draggedTicket || autoScrollVelocityRef.current === 0) {
      autoScrollFrameRef.current = null
      return
    }
    container.scrollLeft += autoScrollVelocityRef.current
    autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScroll)
  }, [draggedTicket])

  const updateAutoScroll = useCallback((clientX: number) => {
    const container = kanbanScrollRef.current
    if (!container || !draggedTicket) {
      stopAutoScroll()
      return
    }

    const rect = container.getBoundingClientRect()
    const edgeThreshold = Math.min(140, rect.width * 0.25)
    const maxSpeed = 24
    const minSpeed = 6
    let velocity = 0

    if (clientX < rect.left + edgeThreshold) {
      const strength = Math.min(1, (rect.left + edgeThreshold - clientX) / edgeThreshold)
      velocity = -(minSpeed + (maxSpeed - minSpeed) * strength)
    } else if (clientX > rect.right - edgeThreshold) {
      const strength = Math.min(1, (clientX - (rect.right - edgeThreshold)) / edgeThreshold)
      velocity = minSpeed + (maxSpeed - minSpeed) * strength
    }

    autoScrollVelocityRef.current = velocity

    if (velocity !== 0) {
      if (autoScrollFrameRef.current === null) {
        autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScroll)
      }
    } else {
      stopAutoScroll()
    }
  }, [draggedTicket, runAutoScroll, stopAutoScroll])

  useEffect(() => {
    if (!draggedTicket) {
      stopAutoScroll()
    }
    return () => stopAutoScroll()
  }, [draggedTicket, stopAutoScroll])

  useEffect(() => {
    if (!draggedTicket) return

    const handleGlobalDragOver = (event: DragEvent) => {
      updateAutoScroll(event.clientX)
    }

    const handleGlobalDragStop = () => {
      stopAutoScroll()
    }

    window.addEventListener("dragover", handleGlobalDragOver)
    window.addEventListener("drop", handleGlobalDragStop)
    window.addEventListener("dragend", handleGlobalDragStop)

    return () => {
      window.removeEventListener("dragover", handleGlobalDragOver)
      window.removeEventListener("drop", handleGlobalDragStop)
      window.removeEventListener("dragend", handleGlobalDragStop)
    }
  }, [draggedTicket, stopAutoScroll, updateAutoScroll])

  useEffect(() => {
    if (viewMode !== "kanban") return

    refreshKanbanTrackWidth()
    const container = kanbanScrollRef.current
    if (!container) return

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => refreshKanbanTrackWidth()) : null

    resizeObserver?.observe(container)
    const firstChild = container.firstElementChild
    if (firstChild) {
      resizeObserver?.observe(firstChild)
    }

    const handleResize = () => refreshKanbanTrackWidth()
    window.addEventListener("resize", handleResize)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener("resize", handleResize)
    }
  }, [
    viewMode,
    groupByEpic,
    filteredTickets.length,
    epics.length,
    kanbanColumns.length,
    refreshKanbanTrackWidth,
  ])

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    if (!canEditTickets) {
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
    setDragOverColumn(null)
    setDropIndicator(null)
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
    stopAutoScroll()
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
    updateAutoScroll(e.clientX)
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
    
    setDropIndicator({ columnId, ticketId: dropTicketId, top: indicatorTop, epicId: undefined, statusId: undefined })
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the column area, not entering a child
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    if (!currentTarget.contains(relatedTarget)) {
      stopAutoScroll()
      setDragOverColumn(null)
      setDropIndicator(null)
    }
  }

  const handleEpicDragOver = (e: React.DragEvent, epicId: string, statusId: string) => {
    if (!draggedTicket) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    updateAutoScroll(e.clientX)
    
    // Calculate drop position based on mouse Y position within the status section
    const statusSection = e.currentTarget as HTMLElement
    const containerRect = statusSection.getBoundingClientRect()
    const mouseY = e.clientY - containerRect.top + statusSection.scrollTop
    
    // Find the ticket card that the mouse is over
    const ticketCards = statusSection.querySelectorAll('[data-ticket-id]')
    let dropTicketId: string | null = null
    let indicatorTop = 0
    
    if (ticketCards.length === 0) {
      // Empty section, show line at top
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
    
    setDropIndicator({ epicId, statusId, ticketId: dropTicketId, top: indicatorTop })
  }

  const handleEpicDrop = async (ticketId: string, epicId: string | null, targetStatus: string) => {
    // Prevent drop if already updating or dropping
    const isUpdating = Object.keys(updatingFields).some(key => key.startsWith(`${ticketId}-`))
    if (isUpdating || droppingTicketId === ticketId) {
      stopAutoScroll()
      setDraggedTicket(null)
      setDragOverColumn(null)
      setDropIndicator(null)
      return
    }

    // Get current ticket
    const currentTicket = allTickets.find(t => t.id === ticketId)
    const previousStatus = currentTicket?.status
    const previousEpicId = currentTicket?.epic?.id || null

    // Cancel move if dropping in the same epic and status
    if (previousEpicId === epicId && previousStatus === targetStatus) {
      stopAutoScroll()
      setDraggedTicket(null)
      setDragOverColumn(null)
      setDropIndicator(null)
      return
    }

    // Apply optimistic update
    setOptimisticStatusUpdates(prev => ({ ...prev, [ticketId]: targetStatus }))
    setDroppingTicketId(ticketId)
    setUpdatingFields(prev => ({ ...prev, [`${ticketId}-status`]: "status", [`${ticketId}-epic_id`]: "epic_id" }))

    // Build update body
    const updates: any = { 
      status: targetStatus,
      epic_id: epicId
    }
    
    // Handle timestamp logic
    if ((previousStatus === "open" || previousStatus === "blocked") && targetStatus !== "open" && targetStatus !== "blocked") {
      updates.started_at = new Date().toISOString()
    }
    
    if (targetStatus === "completed" || targetStatus === "cancelled" || targetStatus === "rejected") {
      updates.completed_at = new Date().toISOString()
      if (!currentTicket?.started_at) {
        updates.started_at = new Date().toISOString()
      }
    }
    
    if (
      (previousStatus === "completed" || previousStatus === "cancelled" || previousStatus === "rejected") &&
      targetStatus !== "completed" &&
      targetStatus !== "cancelled" &&
      targetStatus !== "rejected"
    ) {
      updates.completed_at = null
      updates.reason = null
    }
    
    if (previousStatus === "in_progress" && (targetStatus === "blocked" || targetStatus === "open")) {
      updates.started_at = null
    }
    
    if (targetStatus === "open") {
      updates.started_at = null
      updates.completed_at = null
    }

    // If dropping to cancelled/rejected, prompt for reason first
    if ((targetStatus === "cancelled" || targetStatus === "rejected") && previousStatus !== targetStatus) {
      setPendingDropTicketId(ticketId)
      setPendingDropUpdates(updates)
      setCancelReason("")
      setShowCancelReasonDialog(true)
      // Revert optimistic update
      setOptimisticStatusUpdates(prev => {
        const newState = { ...prev }
        delete newState[ticketId]
        return newState
      })
      setDroppingTicketId(null)
      setUpdatingFields(prev => {
        const newState = { ...prev }
        delete newState[`${ticketId}-status`]
        delete newState[`${ticketId}-epic_id`]
        return newState
      })
      stopAutoScroll()
      setDraggedTicket(null)
      setDragOverColumn(null)
      setDropIndicator(null)
      return
    }

    try {
      await updateTicket.mutateAsync({
        id: ticketId,
        ...updates,
      })
      toast("Ticket updated")
      triggerCardLanding(ticketId)
      
      setTimeout(() => {
        setOptimisticStatusUpdates(prev => {
          const newState = { ...prev }
          delete newState[ticketId]
          return newState
        })
      }, 500)
      
      setDroppingTicketId(null)
      setUpdatingFields(prev => {
        const newState = { ...prev }
        delete newState[`${ticketId}-status`]
        delete newState[`${ticketId}-epic_id`]
        return newState
      })
    } catch (error: any) {
      toast(error.message || "Failed to update ticket", "error")
      setOptimisticStatusUpdates(prev => {
        const newState = { ...prev }
        delete newState[ticketId]
        return newState
      })
      setDroppingTicketId(null)
      setUpdatingFields(prev => {
        const newState = { ...prev }
        delete newState[`${ticketId}-status`]
        delete newState[`${ticketId}-epic_id`]
        return newState
      })
    }
    
    setDraggedTicket(null)
    setDragOverColumn(null)
    setDropIndicator(null)
    stopAutoScroll()
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    if (!draggedTicket) return
    stopAutoScroll()

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
    
    // Condition 3: When any status changed to Completed/Cancelled/Rejected then update completed_at timestamp
    if (targetStatus === "completed" || targetStatus === "cancelled" || targetStatus === "rejected") {
      updates.completed_at = new Date().toISOString()
      // Also ensure started_at is set if not already
      if (!currentTicket?.started_at) {
        updates.started_at = new Date().toISOString()
      }
    }
    
    // Condition 4: If status changed from Completed/Cancelled/Rejected to other status then remove timestamp completed_at
    if (
      (previousStatus === "completed" || previousStatus === "cancelled" || previousStatus === "rejected") &&
      targetStatus !== "completed" &&
      targetStatus !== "cancelled" &&
      targetStatus !== "rejected"
    ) {
      updates.completed_at = null
      // Clear reason when moving away from cancelled/rejected
      updates.reason = null
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

    // If dropping to cancelled/rejected, prompt for reason first
    if ((targetStatus === "cancelled" || targetStatus === "rejected") && previousStatus !== targetStatus) {
      setPendingDropTicketId(ticketId)
      setPendingDropUpdates(updates)
      setCancelReason("")
      setShowCancelReasonDialog(true)
      // Revert optimistic update
      setOptimisticStatusUpdates(prev => {
        const newState = { ...prev }
        delete newState[ticketId]
        return newState
      })
      setDroppingTicketId(null)
      setUpdatingFields(prev => {
        const newState = { ...prev }
        delete newState[`${ticketId}-status`]
        return newState
      })
      return
    }

    // If dropping to returned_to_dev, prompt for reason first
    if (targetStatus === "returned_to_dev" && previousStatus !== "returned_to_dev") {
      setPendingReturnedDropTicketId(ticketId)
      setPendingReturnedDropUpdates(updates)
      setReturnedReason("")
      setShowReturnedReasonDialog(true)
      // Revert optimistic update
      setOptimisticStatusUpdates(prev => {
        const newState = { ...prev }
        delete newState[ticketId]
        return newState
      })
      setDroppingTicketId(null)
      setUpdatingFields(prev => {
        const newState = { ...prev }
        delete newState[`${ticketId}-status`]
        return newState
      })
      return
    }

    try {
      await updateTicket.mutateAsync({
        id: ticketId,
        ...updates,
      })
      toast("Ticket status updated")
      triggerCardLanding(ticketId)
      
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

  useEffect(() => {
    if (!project?.name) return

    window.dispatchEvent(
      new CustomEvent("app-shell-breadcrumb-detail", {
        detail: { label: project.name },
      })
    )

    return () => {
      window.dispatchEvent(
        new CustomEvent("app-shell-breadcrumb-detail", {
          detail: { label: null },
        })
      )
    }
  }, [project?.name])

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

  const projectLinks = project.links || []
  const pinnedProjectIds = preferences.pinned_project_ids || []
  const isProjectPinned = pinnedProjectIds.includes(project.id)

  const handleToggleProjectPin = async () => {
    const nextPinnedProjectIds = isProjectPinned
      ? pinnedProjectIds.filter((id) => id !== project.id)
      : [...pinnedProjectIds, project.id]

    try {
      await updatePreferences({ pinned_project_ids: nextPinnedProjectIds })
      toast(isProjectPinned ? "Project unpinned" : "Project pinned")
    } catch (error: any) {
      toast(error.message || "Failed to update pinned projects", "error")
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] gap-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              variant={viewMode === "kanban" ? "selected" : "ghost"}
              size="icon"
              onClick={() => setViewMode("kanban")}
              className="h-7 w-7"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">Kanban view</span>
            </Button>
            <Button
              variant={viewMode === "gantt" ? "selected" : "ghost"}
              size="icon"
              onClick={() => setViewMode("gantt")}
              className="h-7 w-7"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="sr-only">Gantt view</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              >
                <ListFilter className="h-4 w-4" />
                Filter
                {activeFilterCount > 0 ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Filter Tickets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="space-y-3 p-2" onClick={(event) => event.stopPropagation()}>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Search</p>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="h-8 pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Requester</p>
                  <Select value={requestedByFilter} onValueChange={setRequestedByFilter}>
                    <SelectTrigger className="h-8 relative">
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
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Sprint</p>
                  <Select value={sprintFilter} onValueChange={setSprintFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="All Sprints" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sprints</SelectItem>
                      <SelectItem value="no_sprint">No Sprint</SelectItem>
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Show</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-44">
                    <DropdownMenuItem onClick={() => setAssigneeFilter("all")}>
                      All Tickets
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setAssigneeFilter(user?.id || "all")}
                      disabled={!user}
                    >
                      My Tickets
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAssigneeFilter("unassigned")}>
                      Unassigned
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                  <span className="text-sm">Exclude Done</span>
                  <Switch checked={excludeDone} onCheckedChange={setExcludeDone} />
                </div>
                {viewMode === "kanban" ? (
                  <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                    <span className="text-sm">Group by Epic</span>
                    <Switch checked={groupByEpic} onCheckedChange={setGroupByEpic} />
                  </div>
                ) : null}
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={resetProjectTicketFilters}>
                  Reset Filters
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu
            onOpenChange={(open) => {
              if (!open) {
                setIsAddingProjectLink(false)
                setEditingProjectLinkIndex(null)
                setNewProjectLinkUrl("")
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              >
                <Link2 className="h-4 w-4" />
                <span>Links</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground">
                  {projectLinks.length}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[440px]">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Project Links</span>
                <Badge variant="outline" className="text-xs">
                  {projectLinks.length} link{projectLinks.length === 1 ? "" : "s"}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="space-y-2 p-2" onClick={(event) => event.stopPropagation()}>
                {canEditProjects ? (
                  isAddingProjectLink ? (
                    <div className="flex gap-2">
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
                        className="h-8 flex-1"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={handleAddProjectLink}
                        disabled={!newProjectLinkUrl.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setIsAddingProjectLink(false)
                          setNewProjectLinkUrl("")
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        setIsAddingProjectLink(true)
                        setEditingProjectLinkIndex(null)
                        setNewProjectLinkUrl("")
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add URL
                    </Button>
                  )
                ) : null}
                {projectLinks.length ? (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {projectLinks.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-sm"
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
                              className="h-8 flex-1"
                              autoFocus
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => handleUpdateProjectLink(index)}
                              disabled={!newProjectLinkUrl.trim()}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
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
                            >
                              <BrandLinkIcon url={url} className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate">{url}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{formatLinkLabel(url)}</p>
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-1" />
                            </a>
                            {canEditProjects ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    setIsAddingProjectLink(false)
                                    setEditingProjectLinkIndex(index)
                                    setNewProjectLinkUrl(url)
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveProjectLink(index)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  !isAddingProjectLink && (
                    <p className="text-sm text-muted-foreground px-1 py-2">No links added yet.</p>
                  )
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground",
              isProjectPinned ? "text-amber-500 hover:text-amber-500" : ""
            )}
            onClick={handleToggleProjectPin}
            disabled={isUpdatingPreferences}
          >
            <Pin className={cn("h-4 w-4", isProjectPinned ? "fill-current" : "")} />
            <span>{isProjectPinned ? "Pinned" : "Pin"}</span>
          </Button>
          {canCreateTickets || canEditProjects ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="ml-1 inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Create</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {canCreateTickets ? (
                  <DropdownMenuItem
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("open-ticket-dialog"))
                    }}
                  >
                    Ticket
                    <DropdownMenuShortcut>Alt/Cmd+A</DropdownMenuShortcut>
                  </DropdownMenuItem>
                ) : null}
                {canEditProjects ? (
                  <DropdownMenuItem onClick={() => setIsEpicDialogOpen(true)}>
                    Epic
                  </DropdownMenuItem>
                ) : null}
                {canEditProjects ? (
                  <DropdownMenuItem onClick={() => setIsSprintDialogOpen(true)}>
                    Sprint
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : viewMode === "gantt" ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <GanttChart
            tickets={filteredTickets.filter(ticket => 
              ticket.project?.id === projectId
            )}
            sprints={sprints.filter(sprint => sprint.project_id === projectId)}
            epics={epics.filter(epic => epic.project_id === projectId)}
            onTicketClick={(ticketId) => setSelectedTicketId(ticketId)}
            onSprintClick={(sprintId) => {
              const sprint = sprints.find(s => s.id === sprintId)
              if (sprint) {
                setEditingSprint({
                  id: sprint.id,
                  name: sprint.name,
                  description: sprint.description,
                  status: sprint.status,
                  start_date: sprint.start_date,
                  end_date: sprint.end_date,
                })
                setIsSprintDialogOpen(true)
              }
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div
            ref={kanbanTopScrollRef}
            className="horizontal-scroll mb-2 h-4 overflow-x-auto overflow-y-hidden flex-shrink-0"
            onScroll={(e) => syncKanbanScroll("top", e.currentTarget.scrollLeft)}
          >
            <div style={{ width: Math.max(kanbanScrollTrackWidth, 1), height: 1 }} />
          </div>
          {/* Kanban Board */}
          <div
            ref={kanbanScrollRef}
            className={cn(
              "no-scrollbar flex gap-4 overflow-x-auto overflow-y-hidden flex-1 min-h-0",
              draggedTicket && "kanban-board-dragging"
            )}
            onScroll={(e) => {
              syncKanbanScroll("board", e.currentTarget.scrollLeft)
              refreshKanbanTrackWidth()
            }}
          >
            {groupByEpic ? (
              // Epic-based grouping
              (() => {
                const epicList = [
                  { id: "no_epic", name: "No Epic", color: "#6b7280" },
                  ...epics.map(e => ({ id: e.id, name: e.name, color: e.color }))
                ]
                return epicList.map((epic) => {
                  const epicTickets = ticketsByEpic[epic.id] || {}
                  const totalTickets = Object.values(epicTickets).flat().length
                  
                  return (
                    <div
                      key={epic.id}
                      className={cn(
                        "flex-shrink-0 w-80 flex flex-col rounded-lg transition-all duration-200",
                        dropIndicator?.epicId === epic.id && !dropIndicator?.statusId && "kanban-drop-target"
                      )}
                      onDragOver={(e) => {
                        if (!draggedTicket) return
                        e.preventDefault()
                        e.stopPropagation()
                        updateAutoScroll(e.clientX)
                        setDropIndicator({ epicId: epic.id, statusId: undefined, ticketId: null, top: 0 })
                      }}
                      onDragLeave={(e) => {
                        const relatedTarget = e.relatedTarget as HTMLElement
                        const currentTarget = e.currentTarget as HTMLElement
                        if (!currentTarget.contains(relatedTarget)) {
                          stopAutoScroll()
                          if (dropIndicator?.epicId === epic.id) {
                            setDropIndicator(null)
                          }
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!draggedTicket) return
                        // If dropped on epic column area, keep current status but change epic
                        const currentTicket = allTickets.find(t => t.id === draggedTicket)
                        if (currentTicket) {
                          handleEpicDrop(draggedTicket, epic.id === "no_epic" ? null : epic.id, currentTicket.status)
                        }
                        setDropIndicator(null)
                      }}
                    >
                      <div className="bg-muted/55 border border-border/60 rounded-xl p-3 flex flex-col h-full">
                        <div 
                          className="flex items-center justify-between mb-3 flex-shrink-0"
                          onDragOver={(e) => {
                            if (!draggedTicket) return
                            e.preventDefault()
                            e.stopPropagation()
                            updateAutoScroll(e.clientX)
                            setDropIndicator({ epicId: epic.id, statusId: undefined, ticketId: null, top: 0 })
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (!draggedTicket) return
                            // Dropped on epic header - keep current status, change epic
                            const currentTicket = allTickets.find(t => t.id === draggedTicket)
                            if (currentTicket) {
                              handleEpicDrop(draggedTicket, epic.id === "no_epic" ? null : epic.id, currentTicket.status)
                            }
                            setDropIndicator(null)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Circle className="h-3 w-3" style={{ fill: epic.color, color: epic.color }} />
                            <h3 className="text-sm font-medium">{epic.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {totalTickets}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
                          {kanbanColumns.map((statusColumn) => {
                            const statusTickets = epicTickets[statusColumn.id] || []
                            
                            return (
                              <div key={statusColumn.id} className="space-y-2">
                                <div 
                                  className="flex items-center gap-2 px-2"
                                  onDragOver={(e) => {
                                    if (!draggedTicket) return
                                    e.preventDefault()
                                    e.stopPropagation()
                                    // Show drop indicator at the top of the status section
                                    updateAutoScroll(e.clientX)
                                    setDropIndicator({ epicId: epic.id, statusId: statusColumn.id, ticketId: null, top: 0 })
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (!draggedTicket) return
                                    // Dropped on status header - change both epic and status
                                    handleEpicDrop(draggedTicket, epic.id === "no_epic" ? null : epic.id, statusColumn.id)
                                    setDropIndicator(null)
                                  }}
                                >
                                  <Circle
                                    className="h-2.5 w-2.5"
                                    style={{ color: statusColumn.color, fill: statusColumn.color }}
                                  />
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {statusColumn.label} ({statusTickets.length})
                                  </span>
                                </div>
                                <div 
                                  className={cn(
                                    "space-y-2 relative rounded-md transition-all duration-200",
                                    dropIndicator?.epicId === epic.id && dropIndicator?.statusId === statusColumn.id && "kanban-drop-target"
                                  )}
                                  onDragOver={(e) => {
                                    if (!draggedTicket) return
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleEpicDragOver(e, epic.id, statusColumn.id)
                                  }}
                                  onDragLeave={(e) => {
                                    const relatedTarget = e.relatedTarget as HTMLElement
                                    const currentTarget = e.currentTarget as HTMLElement
                                    if (!currentTarget.contains(relatedTarget)) {
                                      stopAutoScroll()
                                      if (dropIndicator?.epicId === epic.id && dropIndicator?.statusId === statusColumn.id) {
                                        setDropIndicator(null)
                                      }
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (!draggedTicket) return
                                    handleEpicDrop(draggedTicket, epic.id === "no_epic" ? null : epic.id, statusColumn.id)
                                    setDropIndicator(null)
                                  }}
                                >
                                  {/* Drop indicator line for epic-grouped view */}
                                  {dropIndicator?.epicId === epic.id && dropIndicator?.statusId === statusColumn.id && (
                                    <div 
                                      className="kanban-drop-indicator absolute left-0 right-0 h-1 z-10 pointer-events-none rounded-full"
                                      style={{
                                        top: `${dropIndicator.top}px`
                                      }}
                                    />
                                  )}
                                  {statusTickets.map((ticket) => {
                                    const isUpdating = Object.keys(updatingFields).some(key => key.startsWith(`${ticket.id}-`))
                                    const isDroppingThis = droppingTicketId === ticket.id
                                    const canDrag = canEditTickets && !isUpdating && !isDroppingThis
                                    return (
                                    <Card
                                      key={ticket.id}
                                      data-ticket-id={ticket.id}
                                      className={cn(
                                        "kanban-card p-4 bg-background hover:bg-muted/50 border shadow-sm",
                                        isUpdating || isDroppingThis
                                          ? "cursor-not-allowed opacity-50"
                                          : canDrag
                                          ? "cursor-move"
                                          : "cursor-default",
                                        draggedTicket === ticket.id && "kanban-card-dragging",
                                        draggedTicket && draggedTicket !== ticket.id && "kanban-card-dimmed",
                                        justDroppedTicketId === ticket.id && "kanban-card-landed"
                                      )}
                                      draggable={canDrag}
                                      onDragStart={(e) => handleDragStart(e, ticket.id)}
                                      onDragEnd={handleDragEnd}
                                      onClick={() => setSelectedTicketId(ticket.id)}
                                    >
                                      <div className="space-y-3">
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
                                      </div>
                                    </Card>
                                  )})}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })
              })()
            ) : (
              // Status-based grouping (original)
              kanbanColumns.map((column) => {
                const columnTickets = ticketsByStatus[column.id] || []
              
              return (
                <div
                  key={column.id}
                  className={cn(
                    "flex-shrink-0 w-80 flex flex-col rounded-lg transition-all duration-200",
                    dragOverColumn === column.id && "kanban-drop-target"
                  )}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <div className="bg-muted/55 border border-border/60 rounded-xl p-3 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Circle
                          className="h-3 w-3"
                          style={{ color: column.color, fill: column.color }}
                        />
                        <h3 className="text-sm font-medium">{column.label}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {columnTickets.length}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2 overflow-y-auto flex-1 min-h-0 relative">
                      {/* Drop indicator line */}
                      {dropIndicator?.columnId === column.id && !dropIndicator.epicId && (
                        <div 
                          className="kanban-drop-indicator absolute left-0 right-0 h-1 z-10 pointer-events-none rounded-full"
                          style={{
                            top: `${dropIndicator.top}px`
                          }}
                        />
                      )}
                      {columnTickets.map((ticket) => {
                        const isUpdating = Object.keys(updatingFields).some(key => key.startsWith(`${ticket.id}-`))
                        const isDroppingThis = droppingTicketId === ticket.id
                        const canDrag = canEditTickets && !isUpdating && !isDroppingThis
                        const descriptionSnippet = richTextToPlainText(ticket.description)
                        
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
                              updateAutoScroll(e.clientX)
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
                            className={`kanban-card p-4 bg-background hover:bg-muted/50 border shadow-sm ${
                              isUpdating || isDroppingThis
                                ? "cursor-not-allowed opacity-50"
                                : canDrag
                                ? "cursor-move"
                                : "cursor-default"
                            } ${
                              draggedTicket === ticket.id
                                ? "kanban-card-dragging"
                                : draggedTicket && draggedTicket !== ticket.id
                                ? "kanban-card-dimmed"
                                : ""
                            } ${
                              justDroppedTicketId === ticket.id
                                ? "kanban-card-landed"
                                : ""
                            }`}
                          >
                          <div 
                            className="space-y-3 cursor-pointer"
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
                                  {descriptionSnippet && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                      {descriptionSnippet}
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
                                      <BrandLinkIcon url={ticket.links[0]} className="h-3 w-3" />
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
                      
                      {columnTickets.length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          No tickets
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
            )}
          </div>
          
          {filteredTickets.length === 0 && (
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
      <Dialog open={isEpicDialogOpen} onOpenChange={setIsEpicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Epic</DialogTitle>
          </DialogHeader>
          <EpicForm
            projectId={projectId}
            onSuccess={() => {
              setIsEpicDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={isSprintDialogOpen} onOpenChange={(open) => {
        setIsSprintDialogOpen(open)
        if (!open) {
          setEditingSprint(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSprint ? "Edit Sprint" : "Create Sprint"}</DialogTitle>
          </DialogHeader>
          <SprintForm
            projectId={projectId}
            initialData={editingSprint ? {
              id: editingSprint.id,
              name: editingSprint.name,
              description: editingSprint.description ?? undefined,
              status: editingSprint.status,
              start_date: editingSprint.start_date ?? undefined,
              end_date: editingSprint.end_date ?? undefined,
            } : undefined}
            onSuccess={() => {
              setIsSprintDialogOpen(false)
              setEditingSprint(null)
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={showCancelReasonDialog} onOpenChange={setShowCancelReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingDropUpdates?.status === "rejected" ? "Reject Ticket" : "Cancel Ticket"}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for {pendingDropUpdates?.status === "rejected" ? "rejecting" : "cancelling"} this ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder={pendingDropUpdates?.status === "rejected" ? "Enter reject reason..." : "Enter cancellation reason..."}
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
                setPendingDropTicketId(null)
                setPendingDropUpdates(null)
                setCancelReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!cancelReason.trim()) {
                  toast("Please provide a reason", "error")
                  return
                }
                
                if (!pendingDropTicketId || !pendingDropUpdates) return
                
                const ticketId = pendingDropTicketId
                const reasonStatus = pendingDropUpdates.status === "rejected" ? "rejected" : "cancelled"
                const normalizedReason = normalizeRichTextInput(cancelReason.trim())
                if (!normalizedReason) {
                  toast("Please provide a reason", "error")
                  return
                }
                const reasonTimestampKey = reasonStatus === "rejected" ? "rejectedAt" : "cancelledAt"
                const reasonHeading = reasonStatus === "rejected" ? "Reject Reason" : "Cancelled Reason"
                const updates = {
                  ...pendingDropUpdates,
                  reason: { [reasonStatus]: { reason: cancelReason.trim(), [reasonTimestampKey]: new Date().toISOString() } }
                }
                const commentBody = `<p><strong>${reasonHeading}</strong></p>${normalizedReason}`
                
                setShowCancelReasonDialog(false)
                setPendingDropTicketId(null)
                setPendingDropUpdates(null)
                
                // Re-apply optimistic update
                setOptimisticStatusUpdates(prev => ({ ...prev, [ticketId]: reasonStatus }))
                setDroppingTicketId(ticketId)
                setUpdatingFields(prev => ({ ...prev, [`${ticketId}-status`]: "status" }))
                
                try {
                  const commentResponse = await fetch(`/api/tickets/${ticketId}/comments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ body: commentBody }),
                  })

                  if (!commentResponse.ok) {
                    const errorPayload = await commentResponse.json().catch(() => ({}))
                    throw new Error(errorPayload?.error || "Failed to save reason comment")
                  }

                  await updateTicket.mutateAsync({
                    id: ticketId,
                    ...updates,
                  })
                  toast("Ticket status updated")
                  
                  setTimeout(() => {
                    setOptimisticStatusUpdates(prev => {
                      const newState = { ...prev }
                      delete newState[ticketId]
                      return newState
                    })
                  }, 500)
                  
                  setDroppingTicketId(null)
                  setUpdatingFields(prev => {
                    const newState = { ...prev }
                    delete newState[`${ticketId}-status`]
                    return newState
                  })
                } catch (error: any) {
                  toast(error.message || "Failed to update ticket", "error")
                  setOptimisticStatusUpdates(prev => {
                    const newState = { ...prev }
                    delete newState[ticketId]
                    return newState
                  })
                  setDroppingTicketId(null)
                  setUpdatingFields(prev => {
                    const newState = { ...prev }
                    delete newState[`${ticketId}-status`]
                    return newState
                  })
                }
                
                setCancelReason("")
              }}
            >
              {pendingDropUpdates?.status === "rejected" ? "Confirm Rejection" : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showReturnedReasonDialog}
        onOpenChange={(open) => {
          setShowReturnedReasonDialog(open)
          if (!open) {
            setPendingReturnedDropTicketId(null)
            setPendingReturnedDropUpdates(null)
            setReturnedReason("")
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Returned to Dev Reason</DialogTitle>
            <DialogDescription>
              Add the reason before moving this ticket to Returned to Dev.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <RichTextEditor
              value={returnedReason}
              onChange={setReturnedReason}
              placeholder="Explain what should be fixed before QA can continue..."
              minHeight={180}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReturnedReasonDialog(false)
                setPendingReturnedDropTicketId(null)
                setPendingReturnedDropUpdates(null)
                setReturnedReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (isRichTextEmpty(returnedReason)) {
                  toast("Please provide a reason for returning to development", "error")
                  return
                }

                if (!pendingReturnedDropTicketId || !pendingReturnedDropUpdates) return
                const normalizedReason = normalizeRichTextInput(returnedReason)
                if (!normalizedReason) {
                  toast("Please provide a reason for returning to development", "error")
                  return
                }

                const ticketId = pendingReturnedDropTicketId
                const updates = {
                  ...pendingReturnedDropUpdates,
                  returned_to_dev_reason: richTextToPlainText(normalizedReason),
                }
                const commentBody = `<p><strong>Returned to Dev Reason</strong></p>${normalizedReason}`

                setShowReturnedReasonDialog(false)
                setPendingReturnedDropTicketId(null)
                setPendingReturnedDropUpdates(null)

                setOptimisticStatusUpdates(prev => ({ ...prev, [ticketId]: "returned_to_dev" }))
                setDroppingTicketId(ticketId)
                setUpdatingFields(prev => ({ ...prev, [`${ticketId}-status`]: "status" }))

                try {
                  const commentResponse = await fetch(`/api/tickets/${ticketId}/comments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ body: commentBody }),
                  })

                  if (!commentResponse.ok) {
                    const errorPayload = await commentResponse.json().catch(() => ({}))
                    throw new Error(errorPayload?.error || "Failed to save returned reason comment")
                  }

                  await updateTicket.mutateAsync({
                    id: ticketId,
                    ...updates,
                  })
                  toast("Ticket status updated")

                  setTimeout(() => {
                    setOptimisticStatusUpdates(prev => {
                      const newState = { ...prev }
                      delete newState[ticketId]
                      return newState
                    })
                  }, 500)

                  setDroppingTicketId(null)
                  setUpdatingFields(prev => {
                    const newState = { ...prev }
                    delete newState[`${ticketId}-status`]
                    return newState
                  })
                } catch (error: any) {
                  toast(error.message || "Failed to update ticket", "error")
                  setOptimisticStatusUpdates(prev => {
                    const newState = { ...prev }
                    delete newState[ticketId]
                    return newState
                  })
                  setDroppingTicketId(null)
                  setUpdatingFields(prev => {
                    const newState = { ...prev }
                    delete newState[`${ticketId}-status`]
                    return newState
                  })
                }

                setReturnedReason("")
              }}
            >
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
