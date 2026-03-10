"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toast"
import { useDepartments } from "@/hooks/use-departments"
import { useProjects } from "@/hooks/use-projects"
import { useUsers } from "@/hooks/use-users"
import { usePermissions } from "@/hooks/use-permissions"
import { useTicketsFilters } from "@/hooks/use-tickets-filters"
import { useKanbanDrag } from "@/hooks/use-kanban-drag"
import { useTicketStatuses } from "@/hooks/use-ticket-statuses"
import { useTicketSubtaskCounts } from "@/hooks/use-ticket-subtask-counts"
import { useEpics } from "@/hooks/use-epics"
import { useSprints } from "@/hooks/use-sprints"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import { useTicketBoardActions } from "@/features/tickets/hooks/use-ticket-board-actions"
import { useOpenSubtasksDialog } from "@/features/tickets/hooks/use-open-subtasks-dialog"
import { isArchivedStatus } from "@/lib/ticket-statuses"
import {
  ASSIGNEE_ALLOWED_ROLES,
  SQA_ALLOWED_ROLES,
  ROWS_PER_PAGE,
  type SortColumn,
} from "@/lib/ticket-constants"
import {
  useTickets,
  useUpdateTicket,
  useUpdateTicketWithReasonComment,
} from "@/features/tickets/hooks/use-tickets"
import type {
  TicketSortConfig,
  TicketsClientProps,
} from "@/features/tickets/types"
import { TicketsToolbar } from "@/components/tickets/tickets-toolbar"
import { TicketsDialogs } from "@/features/tickets/components/tickets-dialogs"
import { TicketsResults } from "@/features/tickets/components/tickets-results"
import { PageHeader } from "@/components/ui/page-header"
import { EntityPageLayout } from "@/components/ui/entity-page-layout"

const SERVER_SORT_COLUMNS = new Set<SortColumn>([
  "id",
  "title",
  "due_date",
  "type",
  "status",
  "priority",
  "sqa_assigned_at",
])

export default function TicketsPage({ initialProjectId }: TicketsClientProps) {
  const router = useRouter()
  const [sortConfig, setSortConfig] = useState<TicketSortConfig>({
    column: "due_date",
    direction: "asc",
  })

  const { user, flags } = usePermissions()
  const { openSubtasksDialog, askHowToHandleOpenSubtasks, resolveOpenSubtasksDialog } = useOpenSubtasksDialog()
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
    projectId: projectFilter !== "all" ? projectFilter : undefined,
    departmentId:
      departmentFilter !== "all" && departmentFilter !== "no_department"
        ? departmentFilter
        : departmentFilter === "no_department"
          ? "no_department"
          : undefined,
    assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
    requestedById: requestedByFilter !== "all" ? requestedByFilter : undefined,
    sprintId: sprintFilter !== "all" ? sprintFilter : undefined,
    excludeDone,
    excludeSubtasks: true,
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
  const {
    updatingFields,
    selectedTicketId,
    setSelectedTicketId,
    isTicketDialogOpen,
    setTicketDialogOpen,
    showCancelReasonDialog,
    cancelReason,
    setCancelReason,
    showReturnedReasonDialog,
    returnedReason,
    setReturnedReason,
    isEpicDialogOpen,
    setIsEpicDialogOpen,
    isSprintDialogOpen,
    setIsSprintDialogOpen,
    handleOpenCreateEpic,
    handleOpenCreateSprint,
    handleKanbanDrop,
    handleCopyTicketLabel,
    updateTicketField,
    pendingStatusKind,
    handleCancelReasonCancel,
    handleCancelReasonConfirm,
    handleReturnedReasonCancel,
    handleReturnedReasonConfirm,
  } = useTicketBoardActions({
    allTickets,
    projectFilter,
    askHowToHandleOpenSubtasks,
    updateTicket,
    updateTicketWithReasonComment,
  })

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
  const hasSearchQuery = deferredSearchQuery.trim().length > 0
  const totalPages = Math.max(1, ticketsPagination?.totalPages || 1)
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedTickets = sortedTickets

  const handleSelectTicket = useCallback(
    (ticketId: string) => {
      const ticket = allTickets.find((t) => t.id === ticketId)
      if (!ticket) return
      const slug = (ticket.displayId || ticketId.slice(0, 8)).toLowerCase()
      router.push(`/tickets/${slug}`)
    },
    [allTickets, router]
  )

  return (
    <EntityPageLayout
      header={
        <PageHeader
          title="Tickets"
          description={`Browse tickets in ${selectedProjectLabel}. Switch views without losing the current filters.`}
        />
      }
      toolbar={
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
      }
    >
      <TicketsResults
        loading={loading}
        filteredTickets={filteredTickets}
        hasSearchQuery={hasSearchQuery}
        view={view}
        projectFilter={projectFilter}
        sortedTickets={sortedTickets}
        sprints={sprints}
        epics={epics}
        onSelectTicket={handleSelectTicket}
        kanbanProps={{
          columns: kanbanColumns,
          ticketsByStatus,
          subtaskCountMap,
          draggedTicket,
          dragOverColumn,
          dropIndicator,
          justDroppedTicketId,
          canEditTickets,
          onSelectTicket: handleSelectTicket,
          onDragStart: handleDragStart,
          onDragEnd: handleDragEnd,
          onDragOver: handleDragOver,
          onDragLeave: handleDragLeave,
          onDrop: handleDrop,
          kanbanScrollRef,
          kanbanTopScrollRef,
          kanbanScrollTrackWidth,
          onScrollBoard: (left) => syncKanbanScroll("board", left),
          onScrollTop: (left) => syncKanbanScroll("top", left),
          onRefreshTrackWidth: refreshKanbanTrackWidth,
        }}
        tableProps={{
          sortConfig,
          onSort: handleSort,
          tickets: paginatedTickets,
          subtaskCountMap,
          totalCount: ticketsPagination?.total || sortedTickets.length,
          currentPage,
          totalPages: totalPages || 1,
          onPageChange: setCurrentPage,
          startIndex,
          endIndex,
          onCopyTicket: handleCopyTicketLabel,
          onSelectTicket: handleSelectTicket,
          departments,
          users,
          assigneeEligibleUsers,
          sqaEligibleUsers,
          updateTicketField,
          updatingFields,
          excludeDone,
          canEdit: canEditTickets,
        }}
      />

      <TicketsDialogs
        canCreateTickets={canCreateTickets}
        isTicketDialogOpen={isTicketDialogOpen}
        setTicketDialogOpen={setTicketDialogOpen}
        selectedTicketId={selectedTicketId}
        setSelectedTicketId={setSelectedTicketId}
        showCancelReasonDialog={showCancelReasonDialog}
        pendingStatusKind={pendingStatusKind}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        onCancelReasonCancel={handleCancelReasonCancel}
        onCancelReasonConfirm={handleCancelReasonConfirm}
        showOpenSubtasksDialog={!!openSubtasksDialog}
        openSubtasksTargetStatus={openSubtasksDialog?.targetStatus ?? null}
        openSubtasks={openSubtasksDialog?.subtasks || []}
        onOpenSubtasksCancel={() => resolveOpenSubtasksDialog("cancel")}
        onOpenSubtasksKeepOpen={() => resolveOpenSubtasksDialog("keep_open")}
        onOpenSubtasksCloseAll={() => resolveOpenSubtasksDialog("close_all")}
        showReturnedReasonDialog={showReturnedReasonDialog}
        returnedReason={returnedReason}
        setReturnedReason={setReturnedReason}
        onReturnedReasonCancel={handleReturnedReasonCancel}
        onReturnedReasonConfirm={handleReturnedReasonConfirm}
        projectFilter={projectFilter}
        isEpicDialogOpen={isEpicDialogOpen}
        isSprintDialogOpen={isSprintDialogOpen}
        setIsEpicDialogOpen={setIsEpicDialogOpen}
        setIsSprintDialogOpen={setIsSprintDialogOpen}
      />
    </EntityPageLayout>
  )
}
