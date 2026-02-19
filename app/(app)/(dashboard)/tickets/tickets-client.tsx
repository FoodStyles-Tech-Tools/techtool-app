"use client"

import { useState, useMemo, useCallback, memo } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import Link from "next/link"
import { useDepartments } from "@/hooks/use-departments"
import { useTickets, useUpdateTicket } from "@/hooks/use-tickets"
import { useProjects } from "@/hooks/use-projects"
import { useUsers } from "@/hooks/use-users"
import { usePermissions } from "@/hooks/use-permissions"
import { useTicketsFilters } from "@/hooks/use-tickets-filters"
import { useTicketsSort } from "@/hooks/use-tickets-sort"
import { useKanbanDrag } from "@/hooks/use-kanban-drag"
import { useTicketStatuses } from "@/hooks/use-ticket-statuses"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { buildStatusChangeBody } from "@/lib/ticket-statuses"
import type { Ticket } from "@/lib/types"
import { richTextToPlainText } from "@/lib/rich-text"
import {
  ASSIGNEE_ALLOWED_ROLES,
  SQA_ALLOWED_ROLES,
  ROWS_PER_PAGE,
  FIELD_LABELS,
} from "@/lib/ticket-constants"
import { TicketsToolbar } from "@/components/tickets/tickets-toolbar"
import { TicketsKanban } from "@/components/tickets/tickets-kanban"
import { TicketsTable } from "@/components/tickets/tickets-table"

const TicketDetailDialog = dynamic(
  () => import("@/components/ticket-detail-dialog").then((mod) => mod.TicketDetailDialog),
  { ssr: false }
)
const GlobalTicketDialog = dynamic(
  () => import("@/components/global-ticket-dialog").then((mod) => mod.GlobalTicketDialog),
  { ssr: false }
)

export default function TicketsPage() {
  const [updatingFields, setUpdatingFields] = useState<Record<string, string>>({})
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isTicketDialogOpen, setTicketDialogOpen] = useState(false)
  const [showCancelReasonDialog, setShowCancelReasonDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    ticketId: string
    newStatus: string
    body: Record<string, unknown>
  } | null>(null)

  const { user, flags } = usePermissions()
  const { preferences } = useUserPreferences()
  const { data: projectsData } = useProjects()
  const projects = useMemo(() => projectsData || [], [projectsData])

  const filters = useTicketsFilters({
    user: user ?? null,
    preferencesView: preferences.tickets_view ?? null,
    projects: projects.map((p) => ({ id: p.id, name: p.name ?? "", status: p.status })),
  })

  const {
    searchQuery,
    setSearchQuery,
    deferredSearchQuery,
    statusFilter,
    setStatusFilter,
    projectFilter,
    setProjectFilter,
    includeInactiveProjects,
    setIncludeInactiveProjects,
    departmentFilter,
    setDepartmentFilter,
    requestedByFilter,
    setRequestedByFilter,
    assigneeFilter,
    setAssigneeFilter,
    excludeDone,
    setExcludeDone,
    currentPage,
    setCurrentPage,
    view,
    setView,
    resetToolbarFilters,
    activeFilterCount,
    selectedProjectLabel,
  } = filters

  const { data: ticketsData, isLoading: ticketsLoading } = useTickets({
    status: statusFilter !== "all" ? statusFilter : undefined,
    project_id: projectFilter !== "all" ? projectFilter : undefined,
    department_id:
      departmentFilter !== "all" && departmentFilter !== "no_department"
        ? departmentFilter
        : departmentFilter === "no_department"
          ? "no_department"
          : undefined,
    assignee_id: assigneeFilter !== "all" ? assigneeFilter : undefined,
    requested_by_id: requestedByFilter !== "all" ? requestedByFilter : undefined,
    exclude_done: excludeDone,
    limit: ROWS_PER_PAGE,
    page: currentPage,
  })

  const { data: usersData } = useUsers()
  const { departments } = useDepartments()
  const updateTicket = useUpdateTicket()
  const { statuses: ticketStatuses } = useTicketStatuses()

  const allTickets = useMemo(() => ticketsData || [], [ticketsData])
  const users = useMemo(() => usersData || [], [usersData])
  const projectOptions = useMemo(
    () => {
      const visible = includeInactiveProjects
        ? projects
        : projects.filter((p) => p.status?.toLowerCase() !== "inactive")
      return [...visible].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      )
    },
    [projects, includeInactiveProjects]
  )
  const kanbanColumns = useMemo(
    () =>
      ticketStatuses.map((s) => ({ id: s.key, label: s.label, color: s.color })),
    [ticketStatuses]
  )
  const statusKeys = useMemo(() => kanbanColumns.map((c) => c.id), [kanbanColumns])

  const loading = !ticketsData && ticketsLoading
  const canCreateTickets = flags?.canCreateTickets ?? false
  const canEditTickets = flags?.canEditTickets ?? false

  const filteredTickets = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase()
    if (!q) return allTickets
    return allTickets.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        richTextToPlainText(t.description).toLowerCase().includes(q) ||
        t.project?.name.toLowerCase().includes(q) ||
        t.display_id?.toLowerCase().includes(q)
    )
  }, [allTickets, deferredSearchQuery])

  const { sortConfig, handleSort, sortedTickets } = useTicketsSort(filteredTickets)

  const handleKanbanDrop = useCallback(
    async (ticketId: string, columnId: string): Promise<boolean> => {
      const ticket = allTickets.find((t) => t.id === ticketId)
      if (!ticket || ticket.status === columnId) return false
      const previousStatus = ticket.status
      const startedAt = (ticket as { started_at?: string | null }).started_at
      if (columnId === "cancelled") {
        const statusBody = buildStatusChangeBody(previousStatus, columnId, { startedAt })
        setPendingStatusChange({
          ticketId,
          newStatus: columnId,
          body: { status: columnId, ...statusBody },
        })
        setCancelReason("")
        setShowCancelReasonDialog(true)
        return false
      }
      const body = {
        status: columnId,
        ...buildStatusChangeBody(previousStatus, columnId, { startedAt }),
      }
      try {
        await updateTicket.mutateAsync({ id: ticketId, ...body })
        toast("Ticket status updated")
        return true
      } catch (err: unknown) {
        toast((err as { message?: string })?.message ?? "Failed to update ticket", "error")
        return false
      }
    },
    [allTickets, updateTicket]
  )

  const kanban = useKanbanDrag({
    view,
    canEditTickets,
    onDrop: handleKanbanDrop,
  })

  const {
    draggedTicket,
    dragOverColumn,
    dropIndicator,
    justDroppedTicketId,
    kanbanScrollRef,
    kanbanTopScrollRef,
    kanbanScrollTrackWidth,
    refreshKanbanTrackWidth,
    syncKanbanScroll,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = kanban

  const assigneeEligibleUsers = useMemo(
    () => users.filter((user) =>
      user.role ? ASSIGNEE_ALLOWED_ROLES.has(user.role.toLowerCase()) : false
    ),
    [users]
  )
  const sqaEligibleUsers = useMemo(
    () =>
      users.filter((u) =>
        u.role ? SQA_ALLOWED_ROLES.has(u.role.toLowerCase()) : false
      ),
    [users]
  )

  const handleShareView = useCallback(() => {
    if (!navigator?.clipboard?.writeText) {
      toast("Clipboard not available", "error")
      return
    }
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast("Link copied"))
      .catch(() => toast("Failed to copy link", "error"))
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
    } else if (field === "sqa_assignee_id") {
      const previousSqaAssigneeId = currentTicket?.sqa_assignee?.id || null
      const newSqaAssigneeId = value || null
      body[field] = newSqaAssigneeId

      if (!newSqaAssigneeId) {
        body.sqa_assigned_at = null
      } else if (!previousSqaAssigneeId || previousSqaAssigneeId !== newSqaAssigneeId) {
        body.sqa_assigned_at = new Date().toISOString()
      }
    } else if (field === "status") {
      const previousStatus = currentTicket?.status ?? "open"
      const newStatus = value as string

      if (newStatus === "cancelled" && previousStatus !== "cancelled") {
        const statusBody = buildStatusChangeBody(previousStatus, newStatus, {
          startedAt: (currentTicket as { started_at?: string | null })?.started_at,
        })
        Object.assign(body, statusBody)
        body[field] = newStatus
        setPendingStatusChange({ ticketId, newStatus, body })
        setCancelReason("")
        setShowCancelReasonDialog(true)
        return
      }

      body[field] = newStatus
      Object.assign(body, buildStatusChangeBody(previousStatus, newStatus, {
        startedAt: (currentTicket as { started_at?: string | null })?.started_at,
      }))
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

  const hasSearchQuery = deferredSearchQuery.trim().length > 0

  // Pagination - server-side pagination is handled by useTickets
  // For client-side search, we need to handle pagination here
  const totalPages = hasSearchQuery 
    ? Math.ceil(sortedTickets.length / ROWS_PER_PAGE)
    : Math.ceil((ticketsData?.length || 0) / ROWS_PER_PAGE) // Server provides pagination info
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedTickets = useMemo(
    () => (hasSearchQuery ? sortedTickets.slice(startIndex, endIndex) : sortedTickets),
    [sortedTickets, hasSearchQuery, startIndex, endIndex]
  )

  return (
    <div className="space-y-6">
      <TicketsToolbar
        selectedProjectLabel={selectedProjectLabel}
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
        projectOptions={projectOptions}
        includeInactiveProjects={includeInactiveProjects}
        setIncludeInactiveProjects={setIncludeInactiveProjects}
        view={view}
        setView={setView}
        onShareView={handleShareView}
        activeFilterCount={activeFilterCount}
        excludeDone={excludeDone}
        setExcludeDone={setExcludeDone}
        assigneeFilter={assigneeFilter}
        setAssigneeFilter={setAssigneeFilter}
        resetToolbarFilters={resetToolbarFilters}
        canCreateTickets={canCreateTickets}
        onOpenCreateTicket={() => setTicketDialogOpen(true)}
        currentUserId={user?.id ?? null}
      />

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
        <TicketsKanban
          columns={kanbanColumns}
          ticketsByStatus={ticketsByStatus}
          draggedTicket={draggedTicket}
          dragOverColumn={dragOverColumn}
          dropIndicator={dropIndicator}
          justDroppedTicketId={justDroppedTicketId}
          canEditTickets={canEditTickets}
          onSelectTicket={setSelectedTicketId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          kanbanScrollRef={kanbanScrollRef}
          kanbanTopScrollRef={kanbanTopScrollRef}
          kanbanScrollTrackWidth={kanbanScrollTrackWidth}
          onScrollBoard={(left) => syncKanbanScroll("board", left)}
          onScrollTop={(left) => syncKanbanScroll("top", left)}
          onRefreshTrackWidth={refreshKanbanTrackWidth}
        />
      ) : (
        <TicketsTable
          sortConfig={sortConfig}
          onSort={handleSort}
          tickets={paginatedTickets}
          totalCount={sortedTickets.length}
          currentPage={currentPage}
          totalPages={totalPages || 1}
          onPageChange={setCurrentPage}
          startIndex={startIndex}
          endIndex={endIndex}
          onCopyTicket={handleCopyTicketLabel}
          onSelectTicket={setSelectedTicketId}
          departments={departments}
          users={users}
          assigneeEligibleUsers={assigneeEligibleUsers}
          sqaEligibleUsers={sqaEligibleUsers}
          updateTicketField={updateTicketField}
          updatingFields={updatingFields}
          excludeDone={excludeDone}
          canEdit={canEditTickets}
        />
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
