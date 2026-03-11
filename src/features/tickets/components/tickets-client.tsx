"use client"

import { useState, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useProjects } from "@client/hooks/use-projects"
import { usePermissions } from "@client/hooks/use-permissions"
import { useTicketsFilters } from "@client/hooks/use-tickets-filters"
import { useTicketStatuses } from "@client/hooks/use-ticket-statuses"
import { useTicketBoardActions } from "@client/features/tickets/hooks/use-ticket-board-actions"
import { useOpenSubtasksDialog } from "@client/features/tickets/hooks/use-open-subtasks-dialog"
import { isArchivedStatus } from "@lib/ticket-statuses"
import {
  ROWS_PER_PAGE,
  type SortColumn,
} from "@lib/ticket-constants"
import {
  useTickets,
  useUpdateTicket,
  useUpdateTicketWithReasonComment,
} from "@client/features/tickets/hooks/use-tickets"
import type {
  TicketSortConfig,
  TicketsClientProps,
} from "@client/features/tickets/types"
import { TicketsToolbar } from "@client/components/tickets/tickets-toolbar"
import { TicketsDialogs } from "@client/features/tickets/components/tickets-dialogs"
import { TicketsResults } from "@client/features/tickets/components/tickets-results"
import { PageHeader } from "@client/components/ui/page-header"
import { PageLayout } from "@client/components/ui/page-layout"
import { EntityPageLayout } from "@client/components/ui/entity-page-layout"
import { Button } from "@client/components/ui/button"

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
  const navigate = useNavigate()
  const [sortConfig, setSortConfig] = useState<TicketSortConfig>({
    column: "due_date",
    direction: "asc",
  })

  const { user, flags } = usePermissions()
  const { openSubtasksDialog, askHowToHandleOpenSubtasks, resolveOpenSubtasksDialog } = useOpenSubtasksDialog()
  const { data: projectsData } = useProjects()
  const projects = useMemo(() => projectsData || [], [projectsData])

  const filters = useTicketsFilters({
    user: user ?? null,
    projects: projects.map((p) => ({ id: p.id, name: p.name ?? "", status: p.status })),
    initialProjectId: initialProjectId ?? null,
  })

  const {
    deferredSearchQuery,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    projectFilter,
    setProjectFilter,
    assigneeFilter,
    setAssigneeFilter,
    excludeDone,
    setExcludeDone,
    currentPage,
    setCurrentPage,
    resetToolbarFilters,
    selectedProjectLabel,
  } = filters

  const serverSortBy = SERVER_SORT_COLUMNS.has(sortConfig.column) ? sortConfig.column : undefined
  const serverSortDirection = SERVER_SORT_COLUMNS.has(sortConfig.column) ? sortConfig.direction : undefined

  const { data: ticketsData, pagination: ticketsPagination, isLoading: ticketsLoading } = useTickets({
    status: statusFilter !== "all" ? statusFilter : undefined,
    projectId: projectFilter !== "all" ? projectFilter : undefined,
    assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
    excludeDone,
    excludeSubtasks: true,
    q: deferredSearchQuery.trim() || undefined,
    limit: ROWS_PER_PAGE,
    page: currentPage,
    sortBy: serverSortBy,
    sortDirection: serverSortDirection,
  })

  const updateTicket = useUpdateTicket()
  const updateTicketWithReasonComment = useUpdateTicketWithReasonComment()
  const { statuses: ticketStatuses } = useTicketStatuses()

  const allTickets = useMemo(() => ticketsData || [], [ticketsData])
  const filteredTickets = useMemo(
    () => allTickets.filter((ticket) => !isArchivedStatus(ticket.status)),
    [allTickets]
  )
  const sortedTickets = filteredTickets
  const projectOptions = useMemo(
    () => {
      const visible = projects.filter((p) => p.status?.toLowerCase() !== "inactive")
      return [...visible].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      )
    },
    [projects]
  )
  const statusOptions = useMemo(
    () =>
      ticketStatuses
        .filter((status) => !isArchivedStatus(status.key))
        .map((status) => ({ id: status.key, label: status.label })),
    [ticketStatuses]
  )

  const loading = !ticketsData && ticketsLoading
  const canCreateTickets = flags?.canCreateTickets ?? false
  const {
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

  const handleSort = useCallback((column: SortColumn) => {
    setSortConfig((previous) =>
      previous.column === column
        ? { column, direction: previous.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" }
    )
  }, [])

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
      navigate(`/tickets/${slug}`)
    },
    [allTickets, navigate]
  )

  return (
    <PageLayout>
      <EntityPageLayout
        header={
          <PageHeader
          title="Tickets"
          description={`Track and update work in ${selectedProjectLabel}. Keep the queue clean and move quickly.`}
          actions={
            canCreateTickets ? (
              <Button type="button" onClick={() => setTicketDialogOpen(true)}>
                Create Ticket
              </Button>
            ) : null
          }
        />
      }
      toolbar={
        <TicketsToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          projectFilter={projectFilter}
          setProjectFilter={setProjectFilter}
          projectOptions={projectOptions}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          statusOptions={statusOptions}
          excludeDone={excludeDone}
          setExcludeDone={setExcludeDone}
          assigneeFilter={assigneeFilter}
          setAssigneeFilter={setAssigneeFilter}
          resetToolbarFilters={resetToolbarFilters}
          currentUserId={user?.id ?? null}
        />
      }
    >
      <TicketsResults
        loading={loading}
        filteredTickets={filteredTickets}
        hasSearchQuery={hasSearchQuery}
        tableProps={{
          sortConfig,
          onSort: handleSort,
          tickets: paginatedTickets,
          totalCount: ticketsPagination?.total || sortedTickets.length,
          currentPage,
          totalPages: totalPages || 1,
          onPageChange: setCurrentPage,
          startIndex,
          endIndex,
          onSelectTicket: handleSelectTicket,
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
      />
      </EntityPageLayout>
    </PageLayout>
  )
}


