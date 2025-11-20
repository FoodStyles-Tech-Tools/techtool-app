"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, AlertTriangle, Link2, ExternalLink, Pencil, Trash2, Plus, X } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { toast } from "@/components/ui/toast"
import { useDepartments } from "@/hooks/use-departments"
import { useProjects } from "@/hooks/use-projects"
import { useEpics } from "@/hooks/use-epics"
import { Subtasks } from "@/components/subtasks"
import { useTicket, useUpdateTicket } from "@/hooks/use-tickets"
import { useUsers } from "@/hooks/use-users"
import { UserSelectItem, UserSelectValue } from "@/components/user-select-item"
import { TicketTypeSelect } from "@/components/ticket-type-select"
import { TicketPrioritySelect } from "@/components/ticket-priority-select"
import { TicketStatusSelect } from "@/components/ticket-status-select"
import { EpicSelect } from "@/components/epic-select"
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

const ASSIGNEE_ALLOWED_ROLES = new Set(["admin", "member"])

interface TicketDetailDialogProps {
  ticketId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
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
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null)
  const UNASSIGNED_VALUE = "unassigned"
  const NO_DEPARTMENT_VALUE = "no_department"
  const NO_PROJECT_VALUE = "no_project"
  const NO_EPIC_VALUE = "no_epic"
  const { departments } = useDepartments()
  const { data: projectsData } = useProjects()
  const { hasPermission } = usePermissions()
  
  const projects = projectsData || []

  const { data: ticketData, isLoading } = useTicket(ticketId || "", { enabled: !!ticketId && open })
  const { data: usersData } = useUsers()
  const updateTicket = useUpdateTicket()

  const ticket = ticketData?.ticket || null
  const projectId = ticket?.project?.id || ticket?.project_id || null
  const { epics } = useEpics(projectId || "")
  const formatLinkLabel = (url: string) => {
    try {
      const hostname = new URL(url).hostname
      return hostname.replace(/^www\./, "")
    } catch {
      return url
    }
  }

  const users = useMemo(() => usersData || [], [usersData])
  const loading = !ticketData && isLoading

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

  const assigneeEligibleUsers = useMemo(
    () => users.filter((user) =>
      user.role ? ASSIGNEE_ALLOWED_ROLES.has(user.role.toLowerCase()) : false
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
    if (!ticket) return
    
    try {
      const currentLinks = [...(ticket.links || [])]
      currentLinks.splice(index, 1)
      
      await updateTicketWithToast({ links: currentLinks }, "Link removed", "links")
    } catch (error: any) {
      toast(error.message || "Failed to remove link", "error")
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return
    
    // If changing to cancelled, prompt for reason
    if (newStatus === "cancelled" && ticket.status !== "cancelled") {
      setPendingStatusChange(newStatus)
      setCancelReason("")
      setShowCancelReasonDialog(true)
      return
    }
    
    await performStatusChange(newStatus)
  }

  const performStatusChange = async (newStatus: string) => {
    if (!ticket) return
    
    const previousStatus = ticket.status
    const updates: any = { status: newStatus }
    
    // Condition 2: When status from Open/Blocked to any other status then update started_at timestamp
    if ((previousStatus === "open" || previousStatus === "blocked") && newStatus !== "open" && newStatus !== "blocked") {
      updates.started_at = new Date().toISOString()
    }
    
    // Condition 3: When any status changed to Cancelled or Completed then update completed_at timestamp
    if (newStatus === "completed" || newStatus === "cancelled") {
      updates.completed_at = new Date().toISOString()
      // Also ensure started_at is set if not already
      if (!(ticket as any).started_at) {
        updates.started_at = new Date().toISOString()
      }
    }
    
    // Condition 4: If status changed from Completed/Cancelled to other status then remove timestamp completed_at
    if ((previousStatus === "completed" || previousStatus === "cancelled") && newStatus !== "completed" && newStatus !== "cancelled") {
      updates.completed_at = null
      // Clear reason when moving away from cancelled
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

  const handleCancelReasonSubmit = async () => {
    if (!cancelReason.trim()) {
      toast("Please provide a reason for cancellation", "error")
      return
    }
    
    setShowCancelReasonDialog(false)
    const newStatus = pendingStatusChange || "cancelled"
    setPendingStatusChange(null)
    
    if (!ticket) return
    
    const previousStatus = ticket.status
    const updates: any = { 
      status: newStatus,
      reason: { cancelled: { reason: cancelReason.trim(), cancelledAt: new Date().toISOString() } }
    }
    
    // Condition 2: When status from Open/Blocked to any other status then update started_at timestamp
    if ((previousStatus === "open" || previousStatus === "blocked") && newStatus !== "open" && newStatus !== "blocked") {
      updates.started_at = new Date().toISOString()
    }
    
    // Condition 3: When any status changed to Cancelled or Completed then update completed_at timestamp
    if (newStatus === "completed" || newStatus === "cancelled") {
      updates.completed_at = new Date().toISOString()
      // Also ensure started_at is set if not already
      if (!(ticket as any).started_at) {
        updates.started_at = new Date().toISOString()
      }
    }
    
    await updateTicketWithToast(updates, "Status updated", "status")
    setCancelReason("")
  }

  const handleTypeChange = (newType: string) => {
    updateTicketWithToast({ type: newType }, "Type updated", "type")
  }

  const handlePriorityChange = (newPriority: string) => {
    updateTicketWithToast({ priority: newPriority }, "Priority updated", "priority")
  }

  const handleDepartmentChange = (newDepartmentId: string) => {
    updateTicketWithToast(
      { department_id: newDepartmentId === NO_DEPARTMENT_VALUE ? null : newDepartmentId },
      "Department updated",
      "department_id"
    )
  }

  const handleEpicChange = (newEpicId: string | null) => {
    updateTicketWithToast(
      { epic_id: newEpicId },
      "Epic updated",
      "epic_id"
    )
  }

  const handleProjectChange = (newProjectId: string) => {
    updateTicketWithToast(
      { project_id: newProjectId === NO_PROJECT_VALUE ? null : newProjectId },
      "Project updated",
      "project_id"
    )
  }

  const handleAssigneeChange = async (newAssigneeId: string | null) => {
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
    if (!newRequestedById) {
      toast("Requested by cannot be empty", "error")
      return
    }
    updateTicketWithToast({ requested_by_id: newRequestedById }, "Requested by updated", "requested_by_id")
  }

  const handleTitleSave = async () => {
    if (!ticket) return
    if (titleValue.trim() === ticket.title) {
      setIsEditingTitle(false)
      return
    }
    await updateTicketWithToast({ title: titleValue.trim() }, "Title updated")
    setIsEditingTitle(false)
  }

  const handleDescriptionSave = async () => {
    if (!ticket) return
    if (descriptionValue === (ticket.description || "")) {
      setIsEditingDescription(false)
      return
    }
    await updateTicketWithToast({ description: descriptionValue }, "Description updated")
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

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setDescriptionValue(ticket?.description || "")
      setIsEditingDescription(false)
    }
  }

  const handleTimestampChange = async (field: "created_at" | "assigned_at" | "started_at" | "completed_at", value: Date | null) => {
    if (!ticket || !ticketId) return
    
    // Validate timestamp order before sending
    const dateValue = value ? value.toISOString() : null
    
    // Build timestamp map for validation - exclude completed_at if status is not completed/cancelled
    const status = ticket.status
    const effectiveCompletedAt = (status === "completed" || status === "cancelled") 
      ? (field === "completed_at" ? dateValue : ((ticket as any).completed_at || null))
      : null
    
    const timestampMap: Record<string, string | null> = {
      created_at: field === "created_at" ? dateValue : (ticket.created_at || null),
      assigned_at: field === "assigned_at" ? dateValue : ((ticket as any).assigned_at || null),
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
    
    // If setting completed_at and status is not completed/cancelled, don't allow it
    if (field === "completed_at" && status !== "completed" && status !== "cancelled") {
      toast("Cannot set completed_at when status is not completed or cancelled", "error")
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
        : (status === "completed" || status === "cancelled")
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
      } else if (status === "completed" || status === "cancelled") {
        return "Ticket is completed/cancelled but has no completed date"
      } else {
        return "Ticket has a completed date but is not completed/cancelled"
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

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-0">
        <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30">
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
                  disabled={!hasPermission("tickets", "edit") || updatingFields["status"]}
                  triggerClassName="h-7 text-xs"
                />
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !ticket ? (
            <p className="text-sm text-muted-foreground">Ticket not found</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6 min-w-0">
                <Card>
                  <CardContent className="pt-6">
                    {isEditingTitle ? (
                      <Input
                        value={titleValue}
                        onChange={(e) => setTitleValue(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={handleTitleKeyDown}
                        className="text-2xl font-semibold border-2"
                        disabled={!hasPermission("tickets", "edit")}
                        autoFocus
                      />
                    ) : (
                      <h1
                        className="text-3xl font-bold cursor-pointer hover:bg-muted/50 -mx-3 px-3 py-2.5 rounded-md transition-colors leading-tight"
                        onClick={() => {
                          if (hasPermission("tickets", "edit")) {
                            setIsEditingTitle(true)
                          }
                        }}
                      >
                        {ticket.title}
                      </h1>
                    )}
                    
                    {isEditingDescription ? (
                      <div className="space-y-2.5 mt-4">
                        <label className="text-sm font-semibold text-foreground">Description</label>
                        <Textarea
                          value={descriptionValue}
                          onChange={(e) => setDescriptionValue(e.target.value)}
                          onBlur={handleDescriptionSave}
                          onKeyDown={handleDescriptionKeyDown}
                          className="min-h-[180px] text-sm border-2"
                          disabled={!hasPermission("tickets", "edit")}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div
                        className="space-y-2.5 cursor-pointer hover:bg-muted/50 -mx-3 px-3 py-3 rounded-md transition-colors mt-4"
                        onClick={() => {
                          if (hasPermission("tickets", "edit")) {
                            setIsEditingDescription(true)
                          }
                        }}
                      >
                        <label className="text-sm font-semibold text-foreground">Description</label>
                        <p className="text-sm text-muted-foreground min-h-[180px] whitespace-pre-wrap leading-relaxed">
                          {ticket.description || (
                            <span className="italic text-muted-foreground/70">No description provided. Click to add one.</span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-foreground">Links</label>
                        <div className="flex items-center gap-2">
                          {ticket.links?.length ? (
                            <Badge variant="outline" className="text-[11px]">
                              {ticket.links.length} link{ticket.links.length === 1 ? "" : "s"}
                            </Badge>
                          ) : null}
                          {hasPermission("tickets", "edit") && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsAddingLink(true)
                                setNewLinkUrl("")
                              }}
                              className="h-7 px-2"
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
                              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
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
                                    <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate">{url}</p>
                                      <p className="text-[11px] text-muted-foreground truncate">
                                        {formatLinkLabel(url)}
                                      </p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                                  </a>
                                  {hasPermission("tickets", "edit") && (
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

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Subtasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Subtasks ticketId={ticketId} projectName={ticket.project?.name || null} displayId={ticket.display_id} />
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                  <div className="space-y-5">
                    <div className="flex items-start gap-3">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Assignee</label>
                      <div className="flex-1">
                        <Select
                          value={ticket.assignee?.id || UNASSIGNED_VALUE}
                          onValueChange={(value) =>
                            handleAssigneeChange(value === UNASSIGNED_VALUE ? null : value)
                          }
                          disabled={!hasPermission("tickets", "edit") || updatingFields["assignee_id"]}
                        >
                          <SelectTrigger className="h-9 w-full relative overflow-hidden">
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

                    <div className="flex items-start gap-3">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Reporter</label>
                      <div className="flex-1">
                        <Select
                          value={ticket.requested_by?.id ?? undefined}
                          onValueChange={handleRequestedByChange}
                          disabled={!hasPermission("tickets", "edit") || updatingFields["requested_by_id"]}
                        >
                          <SelectTrigger className="h-9 w-full relative overflow-hidden">
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

                    <div className="flex items-start gap-3">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Type</label>
                      <div className="flex-1">
                        <TicketTypeSelect
                          value={ticket.type || "task"}
                          onValueChange={handleTypeChange}
                          disabled={!hasPermission("tickets", "edit") || updatingFields["type"]}
                          triggerClassName="h-9 w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Priority</label>
                      <div className="flex-1">
                        <TicketPrioritySelect
                          value={ticket.priority}
                          onValueChange={handlePriorityChange}
                          disabled={!hasPermission("tickets", "edit") || updatingFields["priority"]}
                          triggerClassName="h-9 w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Department</label>
                      <div className="flex-1">
                        <Select
                          value={ticket.department?.id || NO_DEPARTMENT_VALUE}
                          onValueChange={handleDepartmentChange}
                          disabled={!hasPermission("tickets", "edit") || updatingFields["department_id"]}
                        >
                          <SelectTrigger className="h-9 w-full">
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

                    <div className="flex items-start gap-3">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Epic</label>
                      <div className="flex-1">
                        <EpicSelect
                          value={ticket.epic?.id || null}
                          onValueChange={handleEpicChange}
                          epics={epics}
                          disabled={!hasPermission("tickets", "edit") || updatingFields["epic_id"] || !projectId}
                          triggerClassName="h-9 w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Project</label>
                      <div className="flex-1">
                        <Select
                          value={ticket.project?.id || NO_PROJECT_VALUE}
                          onValueChange={handleProjectChange}
                          disabled={!hasPermission("tickets", "edit") || updatingFields["project_id"]}
                        >
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="No Project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_PROJECT_VALUE}>No Project</SelectItem>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {ticket.status === "cancelled" && ticket.reason?.cancelled && (
                      <div className="flex items-start gap-3">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Reason</label>
                        <div className="flex-1">
                          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                                  {ticket.reason.cancelled.reason}
                                </p>
                                {ticket.reason.cancelled.cancelledAt && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Cancelled on {format(new Date(ticket.reason.cancelled.cancelledAt), "MMM d, yyyy 'at' h:mm a")}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator className="my-4" />

                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Timestamps</h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-24">Created</label>
                          <div className="flex-1">
                            <DateTimePicker
                              value={parseTimestamp(ticket.created_at)}
                              onChange={(date) => handleTimestampChange("created_at", date)}
                              disabled={!hasPermission("tickets", "edit") || updatingFields["created_at"]}
                              placeholder="Not set"
                              className="w-full h-9"
                              hideIcon
                            />
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
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
                              disabled={!hasPermission("tickets", "edit") || !ticket.assignee || updatingFields["assigned_at"]}
                              placeholder="Not set"
                              className="w-full h-9"
                              hideIcon
                            />
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
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
                              disabled={!hasPermission("tickets", "edit") || ticket.status === "open" || updatingFields["started_at"]}
                              placeholder="Not set"
                              className="w-full h-9"
                              hideIcon
                            />
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
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
                              disabled={!hasPermission("tickets", "edit") || (ticket.status !== "completed" && ticket.status !== "cancelled") || updatingFields["completed_at"]}
                              placeholder="Not set"
                              className="w-full h-9"
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
          <Button onClick={handleCancelReasonSubmit}>
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
