"use client"

import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, AlertTriangle, ExternalLink, Pencil, Trash2, Plus, X, ChevronRight, ChevronDown } from "lucide-react"
import { BrandLinkIcon } from "@/components/brand-link-icon"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { toast } from "@/components/ui/toast"
import { Switch } from "@/components/ui/switch"
import { useDepartments } from "@/hooks/use-departments"
import { useProjects } from "@/hooks/use-projects"
import { useEpics } from "@/hooks/use-epics"
import { useSprints } from "@/hooks/use-sprints"
import { Subtasks } from "@/components/subtasks"
import { TicketActivity } from "@/components/ticket-activity"
import { useTicketDetail } from "@/hooks/use-ticket-detail"
import { useUpdateTicket } from "@/hooks/use-tickets"
import { useUsers } from "@/hooks/use-users"
import { UserSelectItem, UserSelectValue } from "@/components/user-select-item"
import { TicketTypeSelect } from "@/components/ticket-type-select"
import { TicketPrioritySelect } from "@/components/ticket-priority-select"
import { TicketStatusSelect } from "@/components/ticket-status-select"
import { EpicSelect } from "@/components/epic-select"
import { SprintSelect } from "@/components/sprint-select"
import { DateTimePicker } from "@/components/ui/datetime-picker"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ASSIGNEE_ALLOWED_ROLES, SQA_ALLOWED_ROLES } from "@/lib/ticket-constants"
import { getSanitizedHtmlProps } from "@/lib/sanitize-html"
import { isRichTextEmpty, normalizeRichTextInput, richTextToPlainText, toDisplayHtml } from "@/lib/rich-text"

interface TicketDetailDialogProps {
  ticketId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor").then((mod) => mod.RichTextEditor),
  { ssr: false }
)

const toUTCISOStringPreserveLocal = (date: Date) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString()
}

export function TicketDetailDialog({ ticketId, open, onOpenChange }: TicketDetailDialogProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [titleValue, setTitleValue] = useState("")
  const [descriptionValue, setDescriptionValue] = useState("")
  const [updatingFields, setUpdatingFields] = useState<Record<string, boolean>>({})
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null)
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [showCancelReasonDialog, setShowCancelReasonDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [showReturnedReasonDialog, setShowReturnedReasonDialog] = useState(false)
  const [returnedReason, setReturnedReason] = useState("")
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null)
  const [isSubtasksCollapsed, setIsSubtasksCollapsed] = useState(true)
  const [includeInactiveProjects, setIncludeInactiveProjects] = useState(false)
  const UNASSIGNED_VALUE = "unassigned"
  const NO_DEPARTMENT_VALUE = "no_department"
  const NO_PROJECT_VALUE = "no_project"
  const NO_EPIC_VALUE = "no_epic"
  const { departments } = useDepartments({ realtime: false })
  const { data: projectsData } = useProjects({ realtime: false })
  const { flags } = usePermissions()
  const canEditTickets = flags?.canEditTickets ?? false
  const ensureCanEdit = () => {
    if (!canEditTickets) {
      toast("You do not have permission to edit tickets.", "error")
      return false
    }
    return true
  }
  
  const projects = projectsData || []

  const { ticket, comments: detailComments, isLoading } = useTicketDetail(ticketId || "", {
    enabled: !!ticketId && open,
  })
  const { data: usersData } = useUsers({ realtime: false })
  const updateTicket = useUpdateTicket()
  const projectOptions = useMemo(() => {
    const selectedProjectId = ticket?.project?.id
    const visibleProjects = includeInactiveProjects
      ? projects
      : projects.filter(
      (project) =>
        project.status?.toLowerCase() !== "inactive" || project.id === selectedProjectId
    )
    return [...visibleProjects].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
    )
  }, [projects, includeInactiveProjects, ticket?.project?.id])
  const projectId = ticket?.project?.id || null
  const { epics } = useEpics(projectId || "")
  const { sprints } = useSprints(projectId || "")
  const formatLinkLabel = (url: string) => {
    try {
      const hostname = new URL(url).hostname
      return hostname.replace(/^www\./, "")
    } catch {
      return url
    }
  }

  const users = useMemo(() => usersData || [], [usersData])
  const loading = !ticket && isLoading

  useEffect(() => {
    if (ticket) {
      setTitleValue(ticket.title || "")
      setDescriptionValue(ticket.description || "")
    }
  }, [ticket])

  useEffect(() => {
    if (!open) {
      setIsEditingTitle(false)
      setIsEditingDescription(false)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setIsSubtasksCollapsed(true)
    }
  }, [open, ticketId])

  const assigneeEligibleUsers = useMemo(
    () => users.filter((user) =>
      user.role ? ASSIGNEE_ALLOWED_ROLES.has(user.role.toLowerCase()) : false
    ),
    [users]
  )
  const sqaEligibleUsers = useMemo(
    () => users.filter((user) =>
      user.role ? SQA_ALLOWED_ROLES.has(user.role.toLowerCase()) : false
    ),
    [users]
  )

  const getUserById = (id?: string | null) => {
    if (!id) return undefined
    return users.find((user) => user.id === id)
  }

  const updateTicketWithToast = async (updates: Record<string, any>, successMessage: string, fieldName?: string) => {
    if (!ticket || !ticketId) return
    
    if (fieldName) {
      setUpdatingFields(prev => ({ ...prev, [fieldName]: true }))
    }
    
    try {
      await updateTicket.mutateAsync({
        id: ticketId,
        ...updates,
      })
      toast(successMessage)
    } catch (error: any) {
      toast(error.message || "Failed to update ticket", "error")
    } finally {
      if (fieldName) {
        setUpdatingFields(prev => {
          const newState = { ...prev }
          delete newState[fieldName]
          return newState
        })
      }
    }
  }

  const handleAddLink = async () => {
    if (!ensureCanEdit()) return
    if (!ticket || !newLinkUrl.trim()) return
    
    try {
      const url = newLinkUrl.trim()
      // Basic URL validation
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        toast("URL must start with http:// or https://", "error")
        return
      }
      
      const currentLinks = ticket.links || []
      const updatedLinks = [...currentLinks, url]
      
      await updateTicketWithToast({ links: updatedLinks }, "Link added", "links")
      setIsAddingLink(false)
      setNewLinkUrl("")
    } catch (error: any) {
      toast(error.message || "Failed to add link", "error")
    }
  }

  const handleUpdateLink = async (index: number) => {
    if (!ensureCanEdit()) return
    if (!ticket || !newLinkUrl.trim()) return
    
    try {
      const url = newLinkUrl.trim()
      // Basic URL validation
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        toast("URL must start with http:// or https://", "error")
        return
      }
      
      const currentLinks = [...(ticket.links || [])]
      currentLinks[index] = url
      
      await updateTicketWithToast({ links: currentLinks }, "Link updated", "links")
      setEditingLinkIndex(null)
      setNewLinkUrl("")
    } catch (error: any) {
      toast(error.message || "Failed to update link", "error")
    }
  }

  const handleRemoveLink = async (index: number) => {
    if (!ensureCanEdit()) return
    if (!ticket || !ticketId) return
    
    try {
      const currentLinks = [...(ticket.links || [])]
      currentLinks.splice(index, 1)
      
      await updateTicketWithToast({ links: currentLinks }, "Link removed", "links")
    } catch (error: any) {
      toast(error.message || "Failed to remove link", "error")
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!ensureCanEdit()) return
    if (!ticket || !ticketId) return
    
    // If changing to cancelled/rejected, prompt for reason
    if ((newStatus === "cancelled" || newStatus === "rejected") && ticket.status !== newStatus) {
      setPendingStatusChange(newStatus)
      setCancelReason("")
      setShowCancelReasonDialog(true)
      return
    }

    // If changing to returned_to_dev, prompt for rich-text reason
    if (newStatus === "returned_to_dev" && ticket.status !== "returned_to_dev") {
      setPendingStatusChange(newStatus)
      setReturnedReason("")
      setShowReturnedReasonDialog(true)
      return
    }
    
    await performStatusChange(newStatus)
  }

  const performStatusChange = async (newStatus: string, returnedToDevReason?: string) => {
    if (!ticket) return
    
    const previousStatus = ticket.status
    const updates: any = { status: newStatus }
    if (returnedToDevReason && newStatus === "returned_to_dev") {
      updates.returned_to_dev_reason = returnedToDevReason
    }
    
    // Condition 2: When status from Open/Blocked to any other status then update started_at timestamp
    if ((previousStatus === "open" || previousStatus === "blocked") && newStatus !== "open" && newStatus !== "blocked") {
      updates.started_at = new Date().toISOString()
    }
    
    // Condition 3: When any status changed to Completed/Cancelled/Rejected then update completed_at timestamp
    if (newStatus === "completed" || newStatus === "cancelled" || newStatus === "rejected") {
      updates.completed_at = new Date().toISOString()
      // Also ensure started_at is set if not already
      if (!(ticket as any).started_at) {
        updates.started_at = new Date().toISOString()
      }
    }
    
    // Condition 4: If status changed from Completed/Cancelled/Rejected to other status then remove timestamp completed_at
    if (
      (previousStatus === "completed" || previousStatus === "cancelled" || previousStatus === "rejected") &&
      newStatus !== "completed" &&
      newStatus !== "cancelled" &&
      newStatus !== "rejected"
    ) {
      updates.completed_at = null
      // Clear reason when moving away from cancelled/rejected
      updates.reason = null
    }
    
    // Condition 5: If status changed from In Progress to Blocked or Open then remove timestamp started_at
    if (previousStatus === "in_progress" && (newStatus === "blocked" || newStatus === "open")) {
      updates.started_at = null
    }
    
    // Additional: If status is open, clear started_at and completed_at
    if (newStatus === "open") {
      updates.started_at = null
      updates.completed_at = null
    }
    
    await updateTicketWithToast(updates, "Status updated", "status")
  }

  const handleReturnedReasonSubmit = async () => {
    if (!ensureCanEdit()) return
    if (!ticket || !ticketId) return
    if (isRichTextEmpty(returnedReason)) {
      toast("Please provide a reason for returning to development", "error")
      return
    }

    const normalizedReason = normalizeRichTextInput(returnedReason)
    if (!normalizedReason) {
      toast("Please provide a reason for returning to development", "error")
      return
    }

    const newStatus = pendingStatusChange || "returned_to_dev"
    setShowReturnedReasonDialog(false)
    setPendingStatusChange(null)

    try {
      const commentBody = `<p><strong>Returned to Dev Reason</strong></p>${normalizedReason}`
      const commentResponse = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      })

      if (!commentResponse.ok) {
        const errorPayload = await commentResponse.json().catch(() => ({}))
        throw new Error(errorPayload?.error || "Failed to save returned reason comment")
      }

      await performStatusChange(newStatus, richTextToPlainText(normalizedReason))
      setReturnedReason("")
    } catch (error: any) {
      toast(error.message || "Failed to return ticket to development", "error")
    }
  }

  const handleCancelReasonSubmit = async () => {
    if (!ensureCanEdit()) return
    if (!cancelReason.trim()) {
      toast("Please provide a reason", "error")
      return
    }
    
    setShowCancelReasonDialog(false)
    const newStatus = pendingStatusChange || "cancelled"
    setPendingStatusChange(null)
    
    if (!ticket || !ticketId) return

    const normalizedReason = normalizeRichTextInput(cancelReason.trim())
    if (!normalizedReason) {
      toast("Please provide a reason", "error")
      return
    }

    const reasonKey = newStatus === "rejected" ? "rejected" : "cancelled"
    const reasonTimestampKey = newStatus === "rejected" ? "rejectedAt" : "cancelledAt"
    const reasonHeading = newStatus === "rejected" ? "Reject Reason" : "Cancelled Reason"
    const commentBody = `<p><strong>${reasonHeading}</strong></p>${normalizedReason}`
    
    const previousStatus = ticket.status
    const updates: any = { 
      status: newStatus,
      reason: { [reasonKey]: { reason: cancelReason.trim(), [reasonTimestampKey]: new Date().toISOString() } }
    }
    
    // Condition 2: When status from Open/Blocked to any other status then update started_at timestamp
    if ((previousStatus === "open" || previousStatus === "blocked") && newStatus !== "open" && newStatus !== "blocked") {
      updates.started_at = new Date().toISOString()
    }
    
    // Condition 3: When any status changed to Completed/Cancelled/Rejected then update completed_at timestamp
    if (newStatus === "completed" || newStatus === "cancelled" || newStatus === "rejected") {
      updates.completed_at = new Date().toISOString()
      // Also ensure started_at is set if not already
      if (!(ticket as any).started_at) {
        updates.started_at = new Date().toISOString()
      }
    }

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

      await updateTicketWithToast(updates, "Status updated", "status")
      setCancelReason("")
    } catch (error: any) {
      toast(error.message || "Failed to update ticket", "error")
    }
  }

  const handleTypeChange = (newType: string) => {
    if (!ensureCanEdit()) return
    updateTicketWithToast({ type: newType }, "Type updated", "type")
  }

  const handlePriorityChange = (newPriority: string) => {
    if (!ensureCanEdit()) return
    updateTicketWithToast({ priority: newPriority }, "Priority updated", "priority")
  }

  const handleDueDateChange = (value: Date | null) => {
    if (!ensureCanEdit()) return
    updateTicketWithToast(
      { due_date: value ? toUTCISOStringPreserveLocal(value) : null },
      value ? "Due date updated" : "Due date cleared",
      "due_date"
    )
  }

  const handleDepartmentChange = (newDepartmentId: string) => {
    if (!ensureCanEdit()) return
    updateTicketWithToast(
      { department_id: newDepartmentId === NO_DEPARTMENT_VALUE ? null : newDepartmentId },
      "Department updated",
      "department_id"
    )
  }

  const handleEpicChange = (newEpicId: string | null) => {
    if (!ensureCanEdit()) return
    updateTicketWithToast(
      { epic_id: newEpicId },
      "Epic updated",
      "epic_id"
    )
  }

  const handleSprintChange = (newSprintId: string | null) => {
    if (!ensureCanEdit()) return
    updateTicketWithToast(
      { sprint_id: newSprintId },
      "Sprint updated",
      "sprint_id"
    )
  }

  const handleProjectChange = (newProjectId: string) => {
    if (!ensureCanEdit()) return
    updateTicketWithToast(
      { project_id: newProjectId === NO_PROJECT_VALUE ? null : newProjectId },
      "Project updated",
      "project_id"
    )
  }

  const handleAssigneeChange = async (newAssigneeId: string | null) => {
    if (!ensureCanEdit()) return
    if (!ticket) return
    
    const previousAssigneeId = (ticket as any).assignee_id
    const updates: any = { assignee_id: newAssigneeId }
    
    // If assignee is null, clear assigned_at
    if (!newAssigneeId) {
      updates.assigned_at = null
    } else {
      // Condition 1: When assignee changed from Null -> add value then add assigned_at timestamp
      // Condition 2: If assignee is not null then change value then change timestamp assigned_at
      if (!previousAssigneeId || previousAssigneeId !== newAssigneeId) {
        updates.assigned_at = new Date().toISOString()
      }
    }
    
    await updateTicketWithToast(updates, "Assignee updated", "assignee_id")
  }

  const handleRequestedByChange = (newRequestedById: string) => {
    if (!ensureCanEdit()) return
    if (!newRequestedById) {
      toast("Requested by cannot be empty", "error")
      return
    }
    updateTicketWithToast({ requested_by_id: newRequestedById }, "Requested by updated", "requested_by_id")
  }

  const handleSqaAssigneeChange = async (newSqaAssigneeId: string | null) => {
    if (!ensureCanEdit()) return
    if (!ticket) return

    const previousSqaAssigneeId = (ticket as any).sqa_assignee_id || ticket.sqa_assignee?.id || null
    const updates: any = { sqa_assignee_id: newSqaAssigneeId }

    if (!newSqaAssigneeId) {
      updates.sqa_assigned_at = null
    } else if (!previousSqaAssigneeId || previousSqaAssigneeId !== newSqaAssigneeId) {
      updates.sqa_assigned_at = new Date().toISOString()
    }

    await updateTicketWithToast(updates, "SQA assignee updated", "sqa_assignee_id")
  }

  const handleTitleSave = async () => {
    if (!ensureCanEdit()) {
      setIsEditingTitle(false)
      return
    }
    if (!ticket) return
    if (titleValue.trim() === ticket.title) {
      setIsEditingTitle(false)
      return
    }
    await updateTicketWithToast({ title: titleValue.trim() }, "Title updated")
    setIsEditingTitle(false)
  }

  const handleDescriptionSave = async () => {
    if (!ensureCanEdit()) {
      setIsEditingDescription(false)
      return
    }
    if (!ticket) return
    const normalizedDescription = normalizeRichTextInput(descriptionValue)
    const currentDescription = normalizeRichTextInput(ticket.description)
    if (normalizedDescription === currentDescription) {
      setIsEditingDescription(false)
      return
    }
    await updateTicketWithToast({ description: normalizedDescription }, "Description updated")
    setIsEditingDescription(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleTitleSave()
    } else if (e.key === "Escape") {
      setTitleValue(ticket?.title || "")
      setIsEditingTitle(false)
    }
  }

  const handleTimestampChange = async (
    field: "created_at" | "assigned_at" | "sqa_assigned_at" | "started_at" | "completed_at",
    value: Date | null
  ) => {
    if (!ensureCanEdit()) return
    if (!ticket || !ticketId) return
    
    // Validate timestamp order before sending
    const dateValue = value ? value.toISOString() : null
    
    // Build timestamp map for validation - exclude completed_at if status is not completed/cancelled/rejected
    const status = ticket.status
    const effectiveCompletedAt = (status === "completed" || status === "cancelled" || status === "rejected") 
      ? (field === "completed_at" ? dateValue : ((ticket as any).completed_at || null))
      : null
    
    const timestampMap: Record<string, string | null> = {
      created_at: field === "created_at" ? dateValue : (ticket.created_at || null),
      assigned_at: field === "assigned_at" ? dateValue : ((ticket as any).assigned_at || null),
      sqa_assigned_at: field === "sqa_assigned_at" ? dateValue : ((ticket as any).sqa_assigned_at || null),
      started_at: field === "started_at" ? dateValue : ((ticket as any).started_at || null),
      completed_at: effectiveCompletedAt,
    }
    
    // Validate timestamp order
    const isValid = validateTimestampOrder(field, dateValue, timestampMap)
    if (!isValid) {
      toast("Invalid timestamp: Timestamps must follow the order: created_at <= assigned_at <= started_at <= completed_at", "error")
      return
    }
    
    // If setting started_at and status is in_progress/blocked, ensure completed_at is cleared
    const updates: any = { [field]: dateValue }
    if (field === "started_at" && (status === "in_progress" || status === "blocked") && (ticket as any).completed_at) {
      updates.completed_at = null
    }
    
    // If setting completed_at and status is not completed/cancelled/rejected, don't allow it
    if (field === "completed_at" && status !== "completed" && status !== "cancelled" && status !== "rejected") {
      toast("Cannot set completed_at when status is not completed, cancelled, or rejected", "error")
      return
    }
    
    await updateTicketWithToast(updates, `${field.replace("_", " ")} updated`, field)
  }
  
  // Helper function to validate timestamp order
  const validateTimestampOrder = (field: string, value: string | null, otherTimestamps: Record<string, string | null>): boolean => {
    if (!value) return true // null values are allowed
    
    const fieldDate = new Date(value)
    if (isNaN(fieldDate.getTime())) return false // invalid date
    
    // Check created_at constraints: created_at <= all others
    if (field === "created_at") {
      if (otherTimestamps.assigned_at && fieldDate > new Date(otherTimestamps.assigned_at)) return false
      if (otherTimestamps.started_at && fieldDate > new Date(otherTimestamps.started_at)) return false
      if (otherTimestamps.completed_at && fieldDate > new Date(otherTimestamps.completed_at)) return false
    }
    
    // Check assigned_at constraints: assigned_at >= created_at AND assigned_at <= started_at, completed_at
    if (field === "assigned_at") {
      if (otherTimestamps.created_at && fieldDate < new Date(otherTimestamps.created_at)) return false
      if (otherTimestamps.started_at && fieldDate > new Date(otherTimestamps.started_at)) return false
      if (otherTimestamps.completed_at && fieldDate > new Date(otherTimestamps.completed_at)) return false
    }
    
    // Check started_at constraints: started_at >= created_at, assigned_at AND started_at <= completed_at
    if (field === "started_at") {
      if (otherTimestamps.created_at && fieldDate < new Date(otherTimestamps.created_at)) return false
      if (otherTimestamps.assigned_at && fieldDate < new Date(otherTimestamps.assigned_at)) return false
      if (otherTimestamps.completed_at && fieldDate > new Date(otherTimestamps.completed_at)) return false
    }
    
    // Check completed_at constraints: completed_at >= created_at, assigned_at, started_at
    if (field === "completed_at") {
      if (otherTimestamps.created_at && fieldDate < new Date(otherTimestamps.created_at)) return false
      if (otherTimestamps.assigned_at && fieldDate < new Date(otherTimestamps.assigned_at)) return false
      if (otherTimestamps.started_at && fieldDate < new Date(otherTimestamps.started_at)) return false
    }
    
    return true
  }

  const getTimestampValidation = () => {
    if (!ticket) return { assigned_at: false, started_at: false, completed_at: false }
    
    const status = ticket.status
    const hasStarted = !!(ticket as any).started_at
    const hasCompleted = !!(ticket as any).completed_at
    const hasAssigned = !!(ticket as any).assigned_at
    const hasAssignee = !!ticket.assignee
    
    return {
      assigned_at: hasAssignee && !hasAssigned,
      started_at: status === "open" 
        ? hasStarted
        : !hasStarted,
      completed_at: status === "open"
        ? hasCompleted
        : (status === "completed" || status === "cancelled" || status === "rejected")
          ? !hasCompleted
          : hasCompleted,
    }
  }

  const timestampValidation = getTimestampValidation()

  const getTimestampWarningMessage = (field: "assigned_at" | "started_at" | "completed_at"): string | null => {
    if (!ticket) return null
    
    const status = ticket.status
    
    if (field === "assigned_at" && timestampValidation.assigned_at) {
      return "Ticket has an assignee but no assigned date set"
    }
    
    if (field === "started_at" && timestampValidation.started_at) {
      if (status === "open") {
        return "Ticket is open but has a started date"
      } else {
        return "Ticket is not open but has no started date"
      }
    }
    
    if (field === "completed_at" && timestampValidation.completed_at) {
      if (status === "open") {
        return "Ticket is open but has a completed date"
      } else if (status === "completed" || status === "cancelled" || status === "rejected") {
        return "Ticket is completed/cancelled/rejected but has no completed date"
      } else {
        return "Ticket has a completed date but is not completed/cancelled/rejected"
      }
    }
    
    return null
  }

  const parseTimestamp = (timestamp: string | null | undefined): Date | null => {
    if (!timestamp) return null
    return new Date(timestamp)
  }

  const handleCopyTicketLabel = () => {
    if (!ticket) return
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

  if (!ticketId) return null
  const subtasksPanelId = `ticket-subtasks-panel-${ticketId}`

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-0">
        <DialogHeader className="px-4 pt-4 pb-3 bg-muted/30">
          <DialogTitle className="sr-only">
            {ticket ? `Ticket ${ticket.display_id || ticketId.slice(0, 8)}: ${ticket.title}` : `Ticket ${ticketId.slice(0, 8)}`}
          </DialogTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleCopyTicketLabel}
                  title="Copy ticket info"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <span className="text-sm font-mono text-muted-foreground bg-background px-2.5 py-1 rounded-md">
                  {ticket?.display_id || ticketId.slice(0, 8)}
                </span>
              </div>
              {ticket && (
                <TicketStatusSelect
                  value={ticket.status}
                  onValueChange={handleStatusChange}
                  disabled={!canEditTickets || updatingFields["status"]}
                  allowSqaStatuses={ticket.project?.require_sqa === true}
                  triggerClassName="h-7 text-xs"
                />
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !ticket ? (
            <p className="text-sm text-muted-foreground">Ticket not found</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <div className="space-y-4 min-w-0">
                <Card className="border-0 shadow-none">
                  <CardContent className="p-4 pt-4">
                    {isEditingTitle ? (
                      <Input
                        value={titleValue}
                        onChange={(e) => setTitleValue(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={handleTitleKeyDown}
                        className="h-10 text-xl font-semibold border-2"
                        disabled={!canEditTickets}
                        autoFocus
                      />
                    ) : (
                      <h1
                        className={[
                          "text-2xl font-semibold -mx-2 px-2 py-2 rounded-md transition-colors leading-tight",
                          canEditTickets ? "cursor-pointer hover:bg-muted/50" : ""
                        ].join(" ")}
                        onClick={() => {
                          if (canEditTickets) {
                            setIsEditingTitle(true)
                          }
                        }}
                      >
                        {ticket.title}
                      </h1>
                    )}
                    
                    {isEditingDescription ? (
                      <div className="space-y-2 mt-3">
                        <label className="text-sm font-semibold text-foreground">Description</label>
                        <RichTextEditor
                          value={descriptionValue}
                          onChange={setDescriptionValue}
                          placeholder="Describe this ticket"
                          className="border-border/50"
                          activateOnClick
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" onClick={handleDescriptionSave}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDescriptionValue(ticket.description || "")
                              setIsEditingDescription(false)
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={[
                          "space-y-2 -mx-2 px-2 py-2 rounded-md transition-colors mt-3",
                          canEditTickets ? "cursor-pointer hover:bg-muted/50" : ""
                        ].join(" ")}
                        onClick={() => {
                          if (canEditTickets) {
                            setIsEditingDescription(true)
                          }
                        }}
                      >
                        <label className="text-sm font-semibold text-foreground">Description</label>
                        {isRichTextEmpty(ticket.description) ? (
                          <p className="text-sm text-muted-foreground min-h-[140px] leading-relaxed">
                            <span className="italic text-muted-foreground/70">
                              No description provided. Click to add one.
                            </span>
                          </p>
                        ) : (
                          <div
                            className="rich-text-content min-h-[140px] text-sm text-foreground leading-relaxed"
                            dangerouslySetInnerHTML={
                              getSanitizedHtmlProps(toDisplayHtml(ticket.description)) ?? { __html: "" }
                            }
                          />
                        )}
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-foreground">Links</label>
                        <div className="flex items-center gap-2">
                          {ticket.links?.length ? (
                            <Badge variant="outline" className="text-[11px]">
                              {ticket.links.length} link{ticket.links.length === 1 ? "" : "s"}
                            </Badge>
                          ) : null}
                          {canEditTickets && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsAddingLink(true)
                                setNewLinkUrl("")
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add URL
                            </Button>
                          )}
                        </div>
                      </div>
                      {isAddingLink && (
                        <div className="flex gap-2 mb-2">
                          <Input
                            placeholder="https://example.com"
                            value={newLinkUrl}
                            onChange={(e) => setNewLinkUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleAddLink()
                              } else if (e.key === "Escape") {
                                setIsAddingLink(false)
                                setNewLinkUrl("")
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddLink}
                            disabled={!newLinkUrl.trim()}
                          >
                            Add
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsAddingLink(false)
                              setNewLinkUrl("")
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {ticket.links?.length ? (
                        <div className="space-y-2 mt-2">
                          {ticket.links.map((url, index) => (
                            <div
                              key={`${url}-${index}`}
                              className="flex items-center justify-between gap-3 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                            >
                              {editingLinkIndex === index ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <Input
                                    value={newLinkUrl}
                                    onChange={(e) => setNewLinkUrl(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleUpdateLink(index)
                                      } else if (e.key === "Escape") {
                                        setEditingLinkIndex(null)
                                        setNewLinkUrl("")
                                      }
                                    }}
                                    className="flex-1"
                                    autoFocus
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUpdateLink(index)}
                                    disabled={!newLinkUrl.trim()}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingLinkIndex(null)
                                      setNewLinkUrl("")
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
                                    <BrandLinkIcon url={url} className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate">{url}</p>
                                      <p className="text-[11px] text-muted-foreground truncate">
                                        {formatLinkLabel(url)}
                                      </p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                                  </a>
                                  {canEditTickets && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingLinkIndex(index)
                                          setNewLinkUrl(url)
                                        }}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveLink(index)}
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
                        !isAddingLink && (
                          <p className="text-sm text-muted-foreground mt-2">No links attached.</p>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-none">
                  <CardHeader className="px-4 pt-4 pb-2">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 text-left"
                      onClick={() => setIsSubtasksCollapsed((prev) => !prev)}
                      aria-expanded={!isSubtasksCollapsed}
                      aria-controls={subtasksPanelId}
                    >
                      {isSubtasksCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-base">Subtasks</CardTitle>
                    </button>
                  </CardHeader>
                  {!isSubtasksCollapsed && (
                    <CardContent id={subtasksPanelId} className="px-4 pb-4 pt-0">
                      <Subtasks ticketId={ticketId} projectName={ticket.project?.name || null} displayId={ticket.display_id} />
                    </CardContent>
                  )}
                </Card>

                <TicketActivity
                  ticketId={ticketId}
                  displayId={ticket.display_id}
                  initialComments={detailComments}
                />
              </div>

              <div>
                <Card>
                  <CardHeader className="px-4 pt-4 pb-2">
                    <CardTitle className="text-base">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Assignee</label>
                      <div className="flex-1">
                        <Select
                          value={ticket.assignee?.id || UNASSIGNED_VALUE}
                          onValueChange={(value) =>
                            handleAssigneeChange(value === UNASSIGNED_VALUE ? null : value)
                          }
                          disabled={!canEditTickets || updatingFields["assignee_id"]}
                        >
                          <SelectTrigger className="h-8 w-full relative overflow-hidden">
                            {ticket.assignee?.id ? (
                              <div className="absolute left-3 right-10 top-0 bottom-0 flex items-center overflow-hidden">
                                <UserSelectValue
                                  users={assigneeEligibleUsers}
                                  value={ticket.assignee?.id || null}
                                  placeholder="Unassigned"
                                  unassignedValue={UNASSIGNED_VALUE}
                                  unassignedLabel="Unassigned"
                                />
                              </div>
                            ) : (
                              <SelectValue placeholder="Unassigned" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                            {assigneeEligibleUsers.map((user) => (
                              <UserSelectItem key={user.id} user={user} value={user.id} />
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Reporter</label>
                      <div className="flex-1">
                        <Select
                          value={ticket.requested_by?.id ?? undefined}
                          onValueChange={handleRequestedByChange}
                          disabled={!canEditTickets || updatingFields["requested_by_id"]}
                        >
                          <SelectTrigger className="h-8 w-full relative overflow-hidden">
                            {ticket.requested_by?.id ? (
                              <div className="absolute left-3 right-10 top-0 bottom-0 flex items-center overflow-hidden">
                                <UserSelectValue
                                  users={users}
                                  value={ticket.requested_by?.id ?? undefined}
                                  placeholder="Select user"
                                />
                              </div>
                            ) : (
                              <SelectValue placeholder="Select user" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <UserSelectItem key={user.id} user={user} value={user.id} />
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">SQA</label>
                      <div className="flex-1">
                        <Select
                          value={ticket.sqa_assignee?.id || UNASSIGNED_VALUE}
                          onValueChange={(value) =>
                            handleSqaAssigneeChange(value === UNASSIGNED_VALUE ? null : value)
                          }
                          disabled={!canEditTickets || updatingFields["sqa_assignee_id"]}
                        >
                          <SelectTrigger className="h-8 w-full relative overflow-hidden">
                            {ticket.sqa_assignee?.id ? (
                              <div className="absolute left-3 right-10 top-0 bottom-0 flex items-center overflow-hidden">
                                <UserSelectValue
                                  users={sqaEligibleUsers}
                                  value={ticket.sqa_assignee?.id || null}
                                  placeholder="Unassigned"
                                  unassignedValue={UNASSIGNED_VALUE}
                                  unassignedLabel="Unassigned"
                                />
                              </div>
                            ) : (
                              <SelectValue placeholder="Unassigned" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                            {sqaEligibleUsers.map((user) => (
                              <UserSelectItem key={user.id} user={user} value={user.id} />
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Type</label>
                      <div className="flex-1">
                        <TicketTypeSelect
                          value={ticket.type || "task"}
                          onValueChange={handleTypeChange}
                          disabled={!canEditTickets || updatingFields["type"]}
                          triggerClassName="h-8 w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Priority</label>
                      <div className="flex-1">
                        <TicketPrioritySelect
                          value={ticket.priority}
                          onValueChange={handlePriorityChange}
                          disabled={!canEditTickets || updatingFields["priority"]}
                          triggerClassName="h-8 w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Due Date</label>
                      <div className="flex-1">
                        <DateTimePicker
                          value={parseTimestamp(ticket.due_date)}
                          onChange={handleDueDateChange}
                          disabled={!canEditTickets || updatingFields["due_date"]}
                          placeholder="No due date"
                          className="w-full h-8"
                          hideIcon
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Department</label>
                      <div className="flex-1">
                        <Select
                          value={ticket.department?.id || NO_DEPARTMENT_VALUE}
                          onValueChange={handleDepartmentChange}
                          disabled={!canEditTickets || updatingFields["department_id"]}
                        >
                          <SelectTrigger className="h-8 w-full">
                            <SelectValue placeholder="No Department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_DEPARTMENT_VALUE}>No Department</SelectItem>
                            {departments.map((department) => (
                              <SelectItem key={department.id} value={department.id}>
                                {department.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Epic</label>
                      <div className="flex-1">
                        <EpicSelect
                          value={ticket.epic?.id || null}
                          onValueChange={handleEpicChange}
                          epics={epics}
                          disabled={!canEditTickets || updatingFields["epic_id"] || !projectId}
                          triggerClassName="h-8 w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Sprint</label>
                      <div className="flex-1">
                        <SprintSelect
                          value={ticket.sprint?.id || null}
                          onValueChange={handleSprintChange}
                          sprints={sprints}
                          disabled={!canEditTickets || updatingFields["sprint_id"] || !projectId}
                          triggerClassName="h-8 w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Project</label>
                      <div className="flex-1">
                        <Select
                          value={ticket.project?.id || NO_PROJECT_VALUE}
                          onValueChange={handleProjectChange}
                          disabled={!canEditTickets || updatingFields["project_id"]}
                        >
                          <SelectTrigger className="h-8 w-full">
                            <SelectValue placeholder="No Project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_PROJECT_VALUE}>No Project</SelectItem>
                            {projectOptions.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <span className="text-xs text-muted-foreground">Include Inactive</span>
                          <Switch
                            checked={includeInactiveProjects}
                            onCheckedChange={setIncludeInactiveProjects}
                            aria-label="Include inactive projects"
                          />
                        </div>
                      </div>
                    </div>

                    {(ticket.status === "cancelled" || ticket.status === "rejected") &&
                      (ticket.reason?.cancelled || ticket.reason?.rejected) && (
                      <div className="flex items-start gap-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Reason</label>
                        <div className="flex-1">
                          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                {(() => {
                                  const reasonData = ticket.status === "rejected"
                                    ? ticket.reason?.rejected
                                    : ticket.reason?.cancelled
                                  if (!reasonData) return null
                                  return (
                                    <>
                                      <p className="text-sm font-medium text-foreground mb-1">
                                        {ticket.status === "rejected" ? "Reject Reason" : "Cancelled Reason"}
                                      </p>
                                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                                        {reasonData.reason}
                                      </p>
                                      {(reasonData.cancelledAt || reasonData.rejectedAt) && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                          {ticket.status === "rejected" ? "Rejected on " : "Cancelled on "}
                                          {format(
                                            new Date(reasonData.rejectedAt || reasonData.cancelledAt),
                                            "MMM d, yyyy 'at' h:mm a"
                                          )}
                                        </p>
                                      )}
                                    </>
                                  )
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator className="my-3" />

                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Timestamps</h3>
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Created</label>
                          <div className="flex-1">
                            <DateTimePicker
                              value={parseTimestamp(ticket.created_at)}
                              onChange={(date) => handleTimestampChange("created_at", date)}
                              disabled={!canEditTickets || updatingFields["created_at"]}
                              placeholder="Not set"
                              className="w-full h-8"
                              hideIcon
                            />
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className="flex items-center gap-2 flex-shrink-0 w-24">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Assigned</label>
                            {!(ticket as any).assigned_at && timestampValidation.assigned_at && (
                              <span title={getTimestampWarningMessage("assigned_at") || ""} className="cursor-help pt-2">
                                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <DateTimePicker
                              value={parseTimestamp((ticket as any).assigned_at)}
                              onChange={(date) => handleTimestampChange("assigned_at", date)}
                              disabled={!canEditTickets || !ticket.assignee || updatingFields["assigned_at"]}
                              placeholder="Not set"
                              className="w-full h-8"
                              hideIcon
                            />
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className="flex items-center gap-2 flex-shrink-0 w-24">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Started</label>
                            {!(ticket as any).started_at && timestampValidation.started_at && (
                              <span title={getTimestampWarningMessage("started_at") || ""} className="cursor-help pt-2">
                                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <DateTimePicker
                              value={parseTimestamp((ticket as any).started_at)}
                              onChange={(date) => handleTimestampChange("started_at", date)}
                              disabled={!canEditTickets || ticket.status === "open" || updatingFields["started_at"]}
                              placeholder="Not set"
                              className="w-full h-8"
                              hideIcon
                            />
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">
                            SQA Assigned
                          </label>
                          <div className="flex-1">
                            <DateTimePicker
                              value={parseTimestamp((ticket as any).sqa_assigned_at)}
                              onChange={(date) => handleTimestampChange("sqa_assigned_at", date)}
                              disabled={!canEditTickets || updatingFields["sqa_assigned_at"]}
                              placeholder="Not set"
                              className="w-full h-8"
                              hideIcon
                            />
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className="flex items-center gap-2 flex-shrink-0 w-24">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Completed</label>
                            {!(ticket as any).completed_at && timestampValidation.completed_at && (
                              <span title={getTimestampWarningMessage("completed_at") || ""} className="cursor-help pt-2">
                                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <DateTimePicker
                              value={parseTimestamp((ticket as any).completed_at)}
                              onChange={(date) => handleTimestampChange("completed_at", date)}
                              disabled={!canEditTickets || (ticket.status !== "completed" && ticket.status !== "cancelled" && ticket.status !== "rejected") || updatingFields["completed_at"]}
                              placeholder="Not set"
                              className="w-full h-8"
                              hideIcon
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={showCancelReasonDialog} onOpenChange={setShowCancelReasonDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pendingStatusChange === "rejected" ? "Reject Ticket" : "Cancel Ticket"}</DialogTitle>
          <DialogDescription>
            Please provide a reason for {pendingStatusChange === "rejected" ? "rejecting" : "cancelling"} this ticket.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            placeholder={pendingStatusChange === "rejected" ? "Enter reject reason..." : "Enter cancellation reason..."}
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
          <Button onClick={handleCancelReasonSubmit} disabled={!canEditTickets}>
            {pendingStatusChange === "rejected" ? "Confirm Rejection" : "Confirm Cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog
      open={showReturnedReasonDialog}
      onOpenChange={(open) => {
        setShowReturnedReasonDialog(open)
        if (!open) {
          setPendingStatusChange(null)
          setReturnedReason("")
        }
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Returned to Dev Reason</DialogTitle>
          <DialogDescription>
            Please provide the reason before moving this ticket to Returned to Dev.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <RichTextEditor
            value={returnedReason}
            onChange={setReturnedReason}
            placeholder="Explain what needs to be fixed before QA can continue..."
            minHeight={180}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowReturnedReasonDialog(false)
              setPendingStatusChange(null)
              setReturnedReason("")
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleReturnedReasonSubmit} disabled={!canEditTickets}>
            Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
