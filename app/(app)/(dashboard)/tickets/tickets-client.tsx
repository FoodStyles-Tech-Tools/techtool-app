"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { useDepartments } from "@/hooks/use-departments"
import { useTickets, useUpdateTicket, useUpdateTicketWithReasonComment } from "@/hooks/use-tickets"
import { useProjects } from "@/hooks/use-projects"
import { useUsers } from "@/hooks/use-users"
import { usePermissions } from "@/hooks/use-permissions"
import { useTicketsFilters } from "@/hooks/use-tickets-filters"
import { useKanbanDrag } from "@/hooks/use-kanban-drag"
import { useTicketStatuses } from "@/hooks/use-ticket-statuses"
import { useTicketSubtaskCounts } from "@/hooks/use-ticket-subtask-counts"
import { useEpics } from "@/hooks/use-epics"
import { useSprints } from "@/hooks/use-sprints"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { buildStatusChangeBody, isArchivedStatus } from "@/lib/ticket-statuses"
import type { Ticket } from "@/lib/types"
import { isRichTextEmpty, normalizeRichTextInput, richTextToPlainText } from "@/lib/rich-text"
import {
  ASSIGNEE_ALLOWED_ROLES,
  SQA_ALLOWED_ROLES,
  ROWS_PER_PAGE,
  FIELD_LABELS,
  type SortColumn,
} from "@/lib/ticket-constants"
import { buildAssignmentPayload, buildStatusPayload, DONE_STATUS_KEYS } from "@/features/tickets/lib/update-payloads"
import { TicketsToolbar } from "@/components/tickets/tickets-toolbar"
import { TicketsKanban } from "@/components/tickets/tickets-kanban"
import { TicketsTable } from "@/components/tickets/tickets-table"
import { EpicForm } from "@/components/forms/epic-form"
import { SprintForm } from "@/components/forms/sprint-form"

type OpenSubtaskRow = {
  id: string
  display_id: string | null
  title: string
  status: string
}

type SubtaskDecision = "cancel" | "keep_open" | "close_all"

const SERVER_SORT_COLUMNS = new Set<SortColumn>([
  "id",
  "title",
  "due_date",
  "type",
  "status",
  "priority",
  "sqa_assigned_at",
])

const TicketDetailDialog = dynamic(
  () => import("@/components/ticket-detail-dialog").then((mod) => mod.TicketDetailDialog),
  { ssr: false }
)
const GlobalTicketDialog = dynamic(
  () => import("@/components/global-ticket-dialog").then((mod) => mod.GlobalTicketDialog),
  { ssr: false }
)
const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor").then((mod) => mod.RichTextEditor),
  { ssr: false }
)
const GanttChart = dynamic(
  () => import("@/components/gantt-chart").then((mod) => mod.GanttChart),
  { ssr: false }
)

type TicketsClientProps = {
  initialProjectId?: string | null
}

export default function TicketsPage({ initialProjectId }: TicketsClientProps) {
  const [updatingFields, setUpdatingFields] = useState<Record<string, string>>({})
  const [sortConfig, setSortConfig] = useState<{ column: SortColumn; direction: "asc" | "desc" }>({
    column: "due_date",
    direction: "asc",
  })
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isTicketDialogOpen, setTicketDialogOpen] = useState(false)
  const [showCancelReasonDialog, setShowCancelReasonDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [showReturnedReasonDialog, setShowReturnedReasonDialog] = useState(false)
  const [returnedReason, setReturnedReason] = useState("")
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    ticketId: string
    newStatus: string
    body: Record<string, unknown>
  } | null>(null)
  const [pendingReturnedStatusChange, setPendingReturnedStatusChange] = useState<{
    ticketId: string
    newStatus: string
    body: Record<string, unknown>
  } | null>(null)
  const [openSubtasksDialog, setOpenSubtasksDialog] = useState<{
    targetStatus: string
    subtasks: OpenSubtaskRow[]
  } | null>(null)
  const [isEpicDialogOpen, setIsEpicDialogOpen] = useState(false)
  const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false)

  const { user, flags } = usePermissions()
  const subtaskDecisionResolverRef = useRef<((decision: SubtaskDecision) => void) | null>(null)
  const { preferences } = useUserPreferences()
  const { data: projectsData } = useProjects()
  const projects = useMemo(() => projectsData || [], [projectsData])

  const filters = useTicketsFilters({
    user: user ?? null,
    preferencesView: preferences.tickets_view ?? null,
    projects: projects.map((p) => ({ id: p.id, name: p.name ?? "", status: p.status })),
    initialProjectId: initialProjectId ?? null,
  })

  const {
    deferredSearchQuery,
    searchQuery,
    setSearchQuery,
    statusFilter,
    projectFilter,
    setProjectFilter,
    includeInactiveProjects,
    setIncludeInactiveProjects,
    departmentFilter,
    requestedByFilter,
    assigneeFilter,
    setAssigneeFilter,
    sprintFilter,
    setSprintFilter,
    excludeDone,
    setExcludeDone,
    currentPage,
    setCurrentPage,
    view,
    setView,
    resetToolbarFilters,
    selectedProjectLabel,
  } = filters

  const listModeRequiresFullDataset = view === "kanban" || view === "gantt"
  const serverSortBy = SERVER_SORT_COLUMNS.has(sortConfig.column) ? sortConfig.column : undefined
  const serverSortDirection = SERVER_SORT_COLUMNS.has(sortConfig.column) ? sortConfig.direction : undefined

  const { data: ticketsData, pagination: ticketsPagination, isLoading: ticketsLoading } = useTickets({
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
    sprint_id: sprintFilter !== "all" ? sprintFilter : undefined,
    exclude_done: excludeDone,
    exclude_subtasks: true,
    q: deferredSearchQuery.trim() || undefined,
    limit: listModeRequiresFullDataset ? undefined : ROWS_PER_PAGE,
    page: listModeRequiresFullDataset ? undefined : currentPage,
    sortBy: serverSortBy,
    sortDirection: serverSortDirection,
  })

  const { data: usersData } = useUsers()
  const { departments } = useDepartments()
  const updateTicket = useUpdateTicket()
  const updateTicketWithReasonComment = useUpdateTicketWithReasonComment()
  const { statuses: ticketStatuses } = useTicketStatuses()
  const { epics } = useEpics(projectFilter === "all" ? null : projectFilter)
  const { sprints } = useSprints(projectFilter === "all" ? null : projectFilter)

  const allTickets = useMemo(() => ticketsData || [], [ticketsData])
  const filteredTickets = useMemo(
    () => allTickets.filter((ticket) => !isArchivedStatus(ticket.status)),
    [allTickets]
  )
  const sortedTickets = filteredTickets
  const parentTicketIds = useMemo(() => allTickets.map((ticket) => ticket.id), [allTickets])
  const { data: subtaskCountMap = {} } = useTicketSubtaskCounts(parentTicketIds)
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
      ticketStatuses
        .filter((status) => !isArchivedStatus(status.key))
        .map((s) => ({ id: s.key, label: s.label, color: s.color })),
    [ticketStatuses]
  )
  const statusKeys = useMemo(() => kanbanColumns.map((c) => c.id), [kanbanColumns])

  const loading = !ticketsData && ticketsLoading
  const canCreateTickets = flags?.canCreateTickets ?? false
  const canEditTickets = flags?.canEditTickets ?? false
  const canEditProjects = flags?.canEditProjects ?? false

  const fetchOpenSubtasksForGuard = useCallback(async (ticketId: string): Promise<OpenSubtaskRow[]> => {
    const response = await fetch(`/api/v2/tickets/${ticketId}?view=detail`)
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload?.error || "Failed to check open subtasks")
    }
    const payload = await response.json().catch(() => ({}))
    const subtasks = Array.isArray(payload?.relations?.subtasks) ? payload.relations.subtasks : []
    return (subtasks as OpenSubtaskRow[]).filter((subtask) => !DONE_STATUS_KEYS.has(String(subtask.status || "")))
  }, [])

  const askHowToHandleOpenSubtasks = useCallback(
    (targetStatus: string, subtasks: OpenSubtaskRow[]) =>
      new Promise<SubtaskDecision>((resolve) => {
        subtaskDecisionResolverRef.current = resolve
        setOpenSubtasksDialog({ targetStatus, subtasks })
      }),
    []
  )

  const resolveOpenSubtasksDialog = useCallback((decision: SubtaskDecision) => {
    const resolver = subtaskDecisionResolverRef.current
    subtaskDecisionResolverRef.current = null
    setOpenSubtasksDialog(null)
    resolver?.(decision)
  }, [])

  const closeSubtasksToStatus = useCallback(async (subtasks: OpenSubtaskRow[], status: string) => {
    if (subtasks.length === 0) return
    await Promise.all(
      subtasks.map(async (subtask) => {
        const response = await fetch(`/api/tickets/${subtask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload?.error || `Failed to close subtask ${subtask.display_id || subtask.id}`)
        }
      })
    )
  }, [])

  const resolveDoneStatusGuard = useCallback(
    async (ticketId: string, targetStatus: string) => {
      if (!DONE_STATUS_KEYS.has(targetStatus)) {
        return { proceed: true, closeSubtasks: false, subtasks: [] as OpenSubtaskRow[] }
      }
      const openSubtasks = await fetchOpenSubtasksForGuard(ticketId)
      if (openSubtasks.length === 0) {
        return { proceed: true, closeSubtasks: false, subtasks: [] as OpenSubtaskRow[] }
      }
      const decision = await askHowToHandleOpenSubtasks(targetStatus, openSubtasks)
      if (decision === "cancel") {
        return { proceed: false, closeSubtasks: false, subtasks: [] as OpenSubtaskRow[] }
      }
      return {
        proceed: true,
        closeSubtasks: decision === "close_all",
        subtasks: openSubtasks,
      }
    },
    [askHowToHandleOpenSubtasks, fetchOpenSubtasksForGuard]
  )

  const handleOpenCreateEpic = useCallback(() => {
    if (projectFilter === "all") {
      toast("Select a project before creating an epic", "error")
      return
    }
    setIsEpicDialogOpen(true)
  }, [projectFilter])

  const handleOpenCreateSprint = useCallback(() => {
    if (projectFilter === "all") {
      toast("Select a project before creating a sprint", "error")
      return
    }
    setIsSprintDialogOpen(true)
  }, [projectFilter])

  const handleKanbanDrop = useCallback(
    async (ticketId: string, columnId: string): Promise<boolean> => {
      const ticket = allTickets.find((t) => t.id === ticketId)
      if (!ticket || ticket.status === columnId) return false
      const previousStatus = ticket.status
      const startedAt = (ticket as { started_at?: string | null }).started_at
      if (columnId === "cancelled" || columnId === "rejected") {
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
      if (columnId === "returned_to_dev" && previousStatus !== "returned_to_dev") {
        const statusBody = buildStatusChangeBody(previousStatus, columnId, { startedAt })
        setPendingReturnedStatusChange({
          ticketId,
          newStatus: columnId,
          body: { status: columnId, ...statusBody },
        })
        setReturnedReason("")
        setShowReturnedReasonDialog(true)
        return false
      }
      const body = {
        status: columnId,
        ...buildStatusChangeBody(previousStatus, columnId, { startedAt }),
      }
      try {
        const doneGuard = await resolveDoneStatusGuard(ticketId, columnId)
        if (!doneGuard.proceed) return false

        await updateTicket.mutateAsync({ id: ticketId, ...body })
        if (doneGuard.closeSubtasks) {
          await closeSubtasksToStatus(doneGuard.subtasks, columnId)
          toast(`Ticket status updated. Closed ${doneGuard.subtasks.length} open subtask${doneGuard.subtasks.length === 1 ? "" : "s"}.`)
        } else {
          toast("Ticket status updated")
        }
        return true
      } catch (err: unknown) {
        toast((err as { message?: string })?.message ?? "Failed to update ticket", "error")
        return false
      }
    },
    [allTickets, closeSubtasksToStatus, resolveDoneStatusGuard, updateTicket]
  )

  const kanban = useKanbanDrag({
    view: view === "kanban" ? "kanban" : "table",
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

  const handleSort = useCallback((column: SortColumn) => {
    setSortConfig((previous) =>
      previous.column === column
        ? { column, direction: previous.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" }
    )
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
    
    let doneGuard: { proceed: boolean; closeSubtasks: boolean; subtasks: OpenSubtaskRow[] } | null = null
    const body: any = {}
    if (field === "requested_by_id") {
      if (!value) {
        toast("Requested by cannot be empty", "error")
        return
      }
      body[field] = value
    } else if (field === "assignee_id") {
      Object.assign(body, buildAssignmentPayload("assignee_id", currentTicket, value))
    } else if (field === "sqa_assignee_id") {
      Object.assign(body, buildAssignmentPayload("sqa_assignee_id", currentTicket, value))
    } else if (field === "status") {
      const previousStatus = currentTicket?.status ?? "open"
      const newStatus = value as string

      if ((newStatus === "cancelled" || newStatus === "rejected") && previousStatus !== newStatus) {
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
      if (newStatus === "returned_to_dev" && previousStatus !== "returned_to_dev") {
        const statusBody = buildStatusChangeBody(previousStatus, newStatus, {
          startedAt: (currentTicket as { started_at?: string | null })?.started_at,
        })
        Object.assign(body, statusBody)
        body[field] = newStatus
        setPendingReturnedStatusChange({ ticketId, newStatus, body })
        setReturnedReason("")
        setShowReturnedReasonDialog(true)
        return
      }

      Object.assign(body, buildStatusPayload(currentTicket, newStatus))
      if (DONE_STATUS_KEYS.has(newStatus) && previousStatus !== newStatus) {
        doneGuard = await resolveDoneStatusGuard(ticketId, newStatus)
        if (!doneGuard.proceed) return
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
      if (field === "status" && doneGuard?.closeSubtasks) {
        await closeSubtasksToStatus(doneGuard.subtasks, String(value))
        toast(`Closed ${doneGuard.subtasks.length} open subtask${doneGuard.subtasks.length === 1 ? "" : "s"}.`)
      }
    } catch (error: any) {
      toast(error.message || "Failed to update ticket", "error")
    } finally {
      setUpdatingFields(prev => {
        const newState = { ...prev }
        delete newState[cellKey]
        return newState
      })
    }
  }, [allTickets, closeSubtasksToStatus, resolveDoneStatusGuard, updateTicket])

  const hasSearchQuery = deferredSearchQuery.trim().length > 0
  const totalPages = Math.max(1, ticketsPagination?.totalPages || 1)
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedTickets = sortedTickets

  return (
    <div className="space-y-6">
      <TicketsToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedProjectLabel={selectedProjectLabel}
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
        projectOptions={projectOptions}
        sprintFilter={sprintFilter}
        setSprintFilter={setSprintFilter}
        sprintOptions={sprints.map((sprint) => ({ id: sprint.id, name: sprint.name }))}
        includeInactiveProjects={includeInactiveProjects}
        setIncludeInactiveProjects={setIncludeInactiveProjects}
        view={view}
        setView={setView}
        onShareView={handleShareView}
        excludeDone={excludeDone}
        setExcludeDone={setExcludeDone}
        assigneeFilter={assigneeFilter}
        setAssigneeFilter={setAssigneeFilter}
        resetToolbarFilters={resetToolbarFilters}
        canCreateTickets={canCreateTickets}
        onOpenCreateTicket={() => setTicketDialogOpen(true)}
        canEditProjects={canEditProjects}
        onOpenCreateEpic={handleOpenCreateEpic}
        onOpenCreateSprint={handleOpenCreateSprint}
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
          subtaskCountMap={subtaskCountMap}
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
      ) : view === "gantt" ? (
        projectFilter === "all" ? (
          <div className="rounded-lg border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Select a project to view the Gantt chart.
            </p>
          </div>
        ) : (
          <div className="flex flex-col min-h-0">
            <GanttChart
              tickets={sortedTickets}
              sprints={sprints}
              epics={epics}
              onTicketClick={(ticketId) => setSelectedTicketId(ticketId)}
            />
          </div>
        )
      ) : (
        <TicketsTable
          sortConfig={sortConfig}
          onSort={handleSort}
          tickets={paginatedTickets}
          subtaskCountMap={subtaskCountMap}
          totalCount={ticketsPagination?.total || sortedTickets.length}
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
            <DialogTitle>{pendingStatusChange?.newStatus === "rejected" ? "Reject Ticket" : "Cancel Ticket"}</DialogTitle>
            <DialogDescription>
              Please provide a reason for {pendingStatusChange?.newStatus === "rejected" ? "rejecting" : "cancelling"} this ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder={pendingStatusChange?.newStatus === "rejected" ? "Enter reject reason..." : "Enter cancellation reason..."}
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
                  toast("Please provide a reason", "error")
                  return
                }
                
                if (!pendingStatusChange) return
                
                const { ticketId, body, newStatus } = pendingStatusChange
                const doneGuard = await resolveDoneStatusGuard(ticketId, newStatus)
                if (!doneGuard.proceed) return

                const normalizedReason = normalizeRichTextInput(cancelReason.trim())
                if (!normalizedReason) {
                  toast("Please provide a reason", "error")
                  return
                }
                const reasonKey = newStatus === "rejected" ? "rejected" : "cancelled"
                const reasonTimestampKey = newStatus === "rejected" ? "rejectedAt" : "cancelledAt"
                const reasonHeading = newStatus === "rejected" ? "Reject Reason" : "Cancelled Reason"
                const finalBody = {
                  ...body,
                  reason: { [reasonKey]: { reason: cancelReason.trim(), [reasonTimestampKey]: new Date().toISOString() } }
                }
                const commentBody = `<p><strong>${reasonHeading}</strong></p>${normalizedReason}`
                
                setShowCancelReasonDialog(false)
                setPendingStatusChange(null)
                
                const cellKey = `${ticketId}-status`
                setUpdatingFields(prev => ({ ...prev, [cellKey]: "status" }))
                
                try {
                  const payload: {
                    id: string
                    status: "cancelled" | "rejected"
                    reason: unknown
                    reasonCommentBody: string
                    startedAt?: string | null
                    completedAt?: string | null
                    epicId?: string | null
                  } = {
                    id: ticketId,
                    status: newStatus as "cancelled" | "rejected",
                    reason: finalBody.reason,
                    reasonCommentBody: commentBody,
                  }

                  if ("started_at" in finalBody) {
                    payload.startedAt = (finalBody as { started_at?: string | null }).started_at ?? null
                  }
                  if ("completed_at" in finalBody) {
                    payload.completedAt = (finalBody as { completed_at?: string | null }).completed_at ?? null
                  }
                  if ("epic_id" in finalBody) {
                    payload.epicId = (finalBody as { epic_id?: string | null }).epic_id ?? null
                  }

                  await updateTicketWithReasonComment.mutateAsync(payload)
                  if (doneGuard.closeSubtasks) {
                    await closeSubtasksToStatus(doneGuard.subtasks, newStatus)
                    toast(`Status updated. Closed ${doneGuard.subtasks.length} open subtask${doneGuard.subtasks.length === 1 ? "" : "s"}.`)
                  } else {
                    toast("Status updated")
                  }
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
              {pendingStatusChange?.newStatus === "rejected" ? "Confirm Rejection" : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!openSubtasksDialog}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && openSubtasksDialog) {
            resolveOpenSubtasksDialog("cancel")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Subtasks Found</DialogTitle>
            <DialogDescription>
              This ticket has open subtasks. Do you want to close them too when changing status to{" "}
              <strong>{openSubtasksDialog?.targetStatus.replace(/_/g, " ")}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-56 space-y-2 overflow-y-auto py-1">
            {(openSubtasksDialog?.subtasks || []).map((subtask) => (
              <div key={subtask.id} className="rounded border px-2.5 py-1.5 text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  {(subtask.display_id || subtask.id.slice(0, 8)).toUpperCase()}
                </span>{" "}
                {subtask.title}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => resolveOpenSubtasksDialog("cancel")}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => resolveOpenSubtasksDialog("keep_open")}>
              Keep Subtasks Open
            </Button>
            <Button onClick={() => resolveOpenSubtasksDialog("close_all")}>
              Close All Subtasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showReturnedReasonDialog}
        onOpenChange={(open) => {
          setShowReturnedReasonDialog(open)
          if (!open) {
            setPendingReturnedStatusChange(null)
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
                setPendingReturnedStatusChange(null)
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

                if (!pendingReturnedStatusChange) return
                const normalizedReason = normalizeRichTextInput(returnedReason)
                if (!normalizedReason) {
                  toast("Please provide a reason for returning to development", "error")
                  return
                }

                const { ticketId, body } = pendingReturnedStatusChange
                const plainReason = richTextToPlainText(normalizedReason).trim()
                const commentBody = `<p><strong>Returned to Dev Reason</strong></p>${normalizedReason}`

                setShowReturnedReasonDialog(false)
                setPendingReturnedStatusChange(null)

                const cellKey = `${ticketId}-status`
                setUpdatingFields(prev => ({ ...prev, [cellKey]: "status" }))

                try {
                  const payload: {
                    id: string
                    status: "returned_to_dev"
                    reason: unknown
                    reasonCommentBody: string
                    startedAt?: string | null
                    completedAt?: string | null
                    epicId?: string | null
                  } = {
                    id: ticketId,
                    status: "returned_to_dev",
                    reason: {
                      returned_to_dev: {
                        reason: plainReason,
                        returnedAt: new Date().toISOString(),
                      },
                    },
                    reasonCommentBody: commentBody,
                  }

                  if ("started_at" in body) {
                    payload.startedAt = (body as { started_at?: string | null }).started_at ?? null
                  }
                  if ("completed_at" in body) {
                    payload.completedAt = (body as { completed_at?: string | null }).completed_at ?? null
                  }
                  if ("epic_id" in body) {
                    payload.epicId = (body as { epic_id?: string | null }).epic_id ?? null
                  }

                  await updateTicketWithReasonComment.mutateAsync(payload)
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

                setReturnedReason("")
              }}
            >
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isEpicDialogOpen}
        onOpenChange={(open) => {
          setIsEpicDialogOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Epic</DialogTitle>
          </DialogHeader>
          {projectFilter !== "all" && (
            <EpicForm
              projectId={projectFilter}
              onSuccess={() => {
                setIsEpicDialogOpen(false)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={isSprintDialogOpen}
        onOpenChange={(open) => {
          setIsSprintDialogOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sprint</DialogTitle>
          </DialogHeader>
          {projectFilter !== "all" && (
            <SprintForm
              projectId={projectFilter}
              onSuccess={() => {
                setIsSprintDialogOpen(false)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
