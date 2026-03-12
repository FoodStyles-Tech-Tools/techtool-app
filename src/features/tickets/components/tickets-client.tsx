"use client"

import { useMemo, useCallback } from "react"
import { PlusIcon } from "@heroicons/react/20/solid"
import { useProjects } from "@client/hooks/use-projects"
import { usePermissions } from "@client/hooks/use-permissions"
import { useTicketsFilters } from "@client/hooks/use-tickets-filters"
import { useTicketStatuses } from "@client/hooks/use-ticket-statuses"
import { useUsers } from "@client/hooks/use-users"
import { useEpics } from "@client/hooks/use-epics"
import { useSprints } from "@client/hooks/use-sprints"
import { useTicketBoardActions } from "@client/features/tickets/hooks/use-ticket-board-actions"
import { useOpenSubtasksDialog } from "@client/features/tickets/hooks/use-open-subtasks-dialog"
import { isArchivedStatus } from "@shared/ticket-statuses"
import { ROWS_PER_PAGE } from "@shared/ticket-constants"
import {
  useTickets,
  useUpdateTicket,
  useUpdateTicketWithReasonComment,
} from "@client/features/tickets/hooks/use-tickets"
import type { TicketsClientProps } from "@client/features/tickets/types"
import { TicketsToolbar } from "@client/components/tickets/tickets-toolbar"
import { TicketsDialogs } from "@client/features/tickets/components/tickets-dialogs"
import { TicketsResults } from "@client/features/tickets/components/tickets-results"
import { useTicketPreview } from "@client/features/tickets/context/ticket-preview-context"
import { PageHeader } from "@client/components/ui/page-header"
import { PageLayout } from "@client/components/ui/page-layout"
import { EntityPageLayout } from "@client/components/ui/entity-page-layout"
import { Button } from "@client/components/ui/button"

export default function TicketsPage({ initialProjectId }: TicketsClientProps) {
  const { openPreview } = useTicketPreview()

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
    excludedStatuses,
    toggleStatusExcluded,
    projectFilter,
    setProjectFilter,
    assigneeFilter,
    setAssigneeFilter,
    requestedByFilter,
    setRequestedByFilter,
    sqaFilter,
    setSqaFilter,
    priorityFilter,
    setPriorityFilter,
    epicFilter,
    setEpicFilter,
    sprintFilter,
    setSprintFilter,
    currentPage,
    setCurrentPage,
    resetToolbarFilters,
    hasActiveFilters,
    selectedProjectLabel,
  } = filters

  const { statuses: ticketStatuses, statusMap } = useTicketStatuses()
  const statusOptions = useMemo(
    () =>
      ticketStatuses
        .filter((status) => !isArchivedStatus(status.key))
        .map((status) => ({ id: status.key, label: status.label })),
    [ticketStatuses]
  )
  const excludedSet = useMemo(
    () => new Set(excludedStatuses.map((s) => s.toLowerCase())),
    [excludedStatuses]
  )
  const includeStatuses = useMemo(
    () =>
      statusOptions
        .filter((o) => !excludedSet.has(o.id.toLowerCase()))
        .map((o) => o.id),
    [statusOptions, excludedSet]
  )

  const { data: ticketsData, pagination: ticketsPagination, isLoading: ticketsLoading } = useTickets({
    projectId: projectFilter !== "all" ? projectFilter : undefined,
    assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
    requestedById: requestedByFilter !== "all" ? requestedByFilter : undefined,
    sqaAssigneeId: sqaFilter !== "all" ? sqaFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    epicId: epicFilter !== "all" ? epicFilter : undefined,
    sprintId: sprintFilter !== "all" ? sprintFilter : undefined,
    includeStatuses: statusOptions.length > 0 ? includeStatuses : undefined,
    excludeSubtasks: true,
    q: deferredSearchQuery.trim() || undefined,
    limit: ROWS_PER_PAGE,
    page: currentPage,
  })

  const updateTicket = useUpdateTicket()
  const updateTicketWithReasonComment = useUpdateTicketWithReasonComment()

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

  const { data: usersData } = useUsers({ realtime: false })
  const users = useMemo(() => usersData || [], [usersData])
  const userOptions = useMemo(
    () =>
      [...users].sort((a, b) =>
        (a.name || a.email || "").localeCompare(b.name || b.email || "", undefined, {
          sensitivity: "base",
        })
      ),
    [users]
  )

  const { epics } = useEpics()
  const { sprints } = useSprints()
  const epicOptions = useMemo(
    () =>
      [...epics]
        .map((e) => ({ id: e.id, name: e.name }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })),
    [epics]
  )
  const sprintOptions = useMemo(
    () =>
      [...sprints]
        .map((s) => ({ id: s.id, name: s.name }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })),
    [sprints]
  )

  const priorityOptions = useMemo(
    () => [
      { id: "low", label: "Low" },
      { id: "medium", label: "Medium" },
      { id: "high", label: "High" },
      { id: "urgent", label: "Urgent" },
    ],
    []
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

  // Memoize callbacks before early return to maintain hook order
  const hasSearchQuery = deferredSearchQuery.trim().length > 0
  const totalPages = Math.max(1, ticketsPagination?.totalPages || 1)
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedTickets = sortedTickets

  const handleSelectTicket = useCallback(
    (ticketId: string) => {
      const ticket = allTickets.find((t) => t.id === ticketId)
      const slug = ticket
        ? (ticket.displayId || ticketId.slice(0, 8)).toLowerCase()
        : ticketId.slice(0, 8).toLowerCase()
      openPreview({ ticketId, slug })
    },
    [allTickets, openPreview]
  )

  return (
    <PageLayout>
      <EntityPageLayout
        header={
          <PageHeader
          title="Tickets"
          actions={
            canCreateTickets ? (
              <Button type="button" onClick={() => setTicketDialogOpen(true)}>
                <PlusIcon className="h-4 w-4" />
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
          statusOptions={statusOptions}
          excludedStatuses={excludedStatuses}
          toggleStatusExcluded={toggleStatusExcluded}
          assigneeFilter={assigneeFilter}
          setAssigneeFilter={setAssigneeFilter}
          reporterFilter={requestedByFilter}
          setReporterFilter={setRequestedByFilter}
          reporterOptions={userOptions}
          sqaFilter={sqaFilter}
          setSqaFilter={setSqaFilter}
          sqaOptions={userOptions}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          priorityOptions={priorityOptions}
          epicFilter={epicFilter}
          setEpicFilter={setEpicFilter}
          epicOptions={epicOptions}
          sprintFilter={sprintFilter}
          setSprintFilter={setSprintFilter}
          sprintOptions={sprintOptions}
          resetToolbarFilters={resetToolbarFilters}
          hasActiveFilters={hasActiveFilters}
          currentUserId={user?.id ?? null}
          statusMap={statusMap}
        />
      }
    >
      <TicketsResults
        loading={loading}
        filteredTickets={filteredTickets}
        hasSearchQuery={hasSearchQuery}
        tableProps={{
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


