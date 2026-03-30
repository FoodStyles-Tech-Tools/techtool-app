"use client"

import { useMemo, useCallback, useState, useEffect } from "react"
import { TableCellsIcon, ViewColumnsIcon } from "@heroicons/react/24/outline"
import { useProjects } from "@client/hooks/use-projects"
import { usePermissions } from "@client/hooks/use-permissions"
import { useTicketsFilters } from "@client/hooks/use-tickets-filters"
import { useTicketStatuses } from "@client/hooks/use-ticket-statuses"
import { useUsers } from "@client/hooks/use-users"
import { useEpics } from "@client/hooks/use-epics"
import { useSprints } from "@client/hooks/use-sprints"
import { useTicketBoardActions } from "@client/features/tickets/hooks/use-ticket-board-actions"
import { useOpenSubtasksDialog } from "@client/features/tickets/hooks/use-open-subtasks-dialog"
import { useUserPreferences } from "@client/hooks/use-user-preferences"
import { filterStatusesBySqaRequirement, isArchivedStatus } from "@shared/ticket-statuses"
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
import { Select } from "@client/components/ui/select"
import { FilterField } from "@client/components/ui/filter-field"
import { toast } from "@client/components/ui/toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { cn } from "@client/lib/utils"

type ViewMode = "table" | "kanban"

const BULK_NO_CHANGE = "__no_change__"
const BULK_CLEAR_VALUE = "__clear__"

function ViewToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}) {
  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-muted p-0.5"
      role="group"
      aria-label="View mode"
    >
      <Button
        variant={viewMode === "table" ? "selected" : "ghost"}
        size="sm"
        className={cn("h-7 px-3", viewMode === "table" ? "shadow-none" : "")}
        type="button"
        onClick={() => onViewModeChange("table")}
        title="Table view"
      >
        <TableCellsIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        <span className="text-xs font-medium">Table</span>
      </Button>
      <Button
        variant={viewMode === "kanban" ? "selected" : "ghost"}
        size="sm"
        className={cn("h-7 px-3", viewMode === "kanban" ? "shadow-none" : "")}
        type="button"
        onClick={() => onViewModeChange("kanban")}
        title="Kanban board"
      >
        <ViewColumnsIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        <span className="text-xs font-medium">Board</span>
      </Button>
    </div>
  )
}

export default function TicketsPage({ initialProjectId }: TicketsClientProps) {
  const { openPreview } = useTicketPreview()

  const { user, flags } = usePermissions()
  const { openSubtasksDialog, askHowToHandleOpenSubtasks, resolveOpenSubtasksDialog } = useOpenSubtasksDialog()
  const { data: projectsData } = useProjects()
  const projects = useMemo(() => projectsData || [], [projectsData])

  // --- User preferences for view mode ---
  const { preferences, updatePreferences } = useUserPreferences()
  const [viewMode, setViewModeLocal] = useState<ViewMode>("kanban")

  // Sync view mode from preferences once loaded
  useEffect(() => {
    if (preferences.user_id) {
      setViewModeLocal(preferences.tickets_view ?? "kanban")
    }
  }, [preferences.user_id, preferences.tickets_view])

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewModeLocal(mode)
      updatePreferences({ tickets_view: mode }).catch(() => {
        // non-critical; view mode just won't persist
      })
    },
    [updatePreferences]
  )

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
    typeFilter,
    setTypeFilter,
    epicFilter,
    setEpicFilter,
    sprintFilter,
    setSprintFilter,
    currentPage,
    setCurrentPage,
    resetToolbarFilters,
    hasActiveFilters,
  } = filters

  // For Kanban, we want to load ALL tickets without pagination so the board is complete.
  // For table, use normal pagination.
  const isKanban = viewMode === "kanban"

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
      isKanban
        ? statusOptions.map((o) => o.id)
        : statusOptions
            .filter((o) => !excludedSet.has(o.id.toLowerCase()))
            .map((o) => o.id),
    [statusOptions, excludedSet, isKanban]
  )

  const selectedProjectForBoard = useMemo(
    () =>
      projectFilter !== "all"
        ? projects.find((project) => project.id === projectFilter) ?? null
        : null,
    [projectFilter, projects]
  )

  const boardStatuses = useMemo(
    () =>
      selectedProjectForBoard
        ? filterStatusesBySqaRequirement(
            ticketStatuses,
            selectedProjectForBoard.require_sqa === true
          )
        : ticketStatuses,
    [selectedProjectForBoard, ticketStatuses]
  )

  const {
    data: ticketsData,
    pagination: ticketsPagination,
    isLoading: ticketsLoading,
    refetch: refetchTickets,
  } = useTickets({
    projectId: projectFilter !== "all" ? projectFilter : undefined,
    assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
    requestedById: requestedByFilter !== "all" ? requestedByFilter : undefined,
    sqaAssigneeId: sqaFilter !== "all" ? sqaFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    epicId: epicFilter !== "all" ? epicFilter : undefined,
    sprintId: sprintFilter !== "all" ? sprintFilter : undefined,
    includeStatuses: statusOptions.length > 0 ? includeStatuses : undefined,
    excludeSubtasks: true,
    q: deferredSearchQuery.trim() || undefined,
    limit: isKanban ? 500 : ROWS_PER_PAGE,
    page: isKanban ? 1 : currentPage,
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
  const canEditTickets = flags?.canEditTickets ?? false
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([])
  const [isBulkEditOpen, setBulkEditOpen] = useState(false)
  const [isBulkTicketUpdating, setIsBulkTicketUpdating] = useState(false)
  const [bulkStatusValue, setBulkStatusValue] = useState<string>(BULK_NO_CHANGE)
  const [bulkProjectValue, setBulkProjectValue] = useState<string>(BULK_NO_CHANGE)
  const [bulkEpicValue, setBulkEpicValue] = useState<string>(BULK_NO_CHANGE)
  const [bulkSprintValue, setBulkSprintValue] = useState<string>(BULK_NO_CHANGE)
  const {
    selectedTicketId,
    setSelectedTicketId,
    isTicketDialogOpen,
    setTicketDialogOpen,
    handleKanbanDrop,
  } = useTicketBoardActions({
    allTickets,
    projectFilter,
    askHowToHandleOpenSubtasks,
    updateTicket,
    updateTicketWithReasonComment,
  })

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

  const handleToggleTicketSelection = useCallback((ticketId: string, checked: boolean) => {
    setSelectedTicketIds((prev) =>
      checked ? [...prev, ticketId] : prev.filter((id) => id !== ticketId)
    )
  }, [])

  const handleToggleSelectAllVisible = useCallback(
    (checked: boolean) => {
      const visibleIds = paginatedTickets.map((ticket) => ticket.id)
      setSelectedTicketIds((prev) => {
        if (!checked) {
          return prev.filter((id) => !visibleIds.includes(id))
        }
        const next = new Set([...prev, ...visibleIds])
        return Array.from(next)
      })
    },
    [paginatedTickets]
  )

  const resetBulkEditFields = useCallback(() => {
    setBulkStatusValue(BULK_NO_CHANGE)
    setBulkProjectValue(BULK_NO_CHANGE)
    setBulkEpicValue(BULK_NO_CHANGE)
    setBulkSprintValue(BULK_NO_CHANGE)
  }, [])

  const hasBulkEditChanges = useMemo(
    () =>
      bulkStatusValue !== BULK_NO_CHANGE ||
      bulkProjectValue !== BULK_NO_CHANGE ||
      bulkEpicValue !== BULK_NO_CHANGE ||
      bulkSprintValue !== BULK_NO_CHANGE,
    [bulkStatusValue, bulkProjectValue, bulkEpicValue, bulkSprintValue]
  )

  const handleApplyBulkTicketUpdates = useCallback(async () => {
    if (selectedTicketIds.length === 0) return

    const updates: {
      status?: string
      projectId?: string | null
      epicId?: string | null
      sprintId?: string | null
    } = {}

    if (bulkStatusValue !== BULK_NO_CHANGE) {
      updates.status = bulkStatusValue
    }
    if (bulkProjectValue !== BULK_NO_CHANGE) {
      updates.projectId = bulkProjectValue === BULK_CLEAR_VALUE ? null : bulkProjectValue
    }
    if (bulkEpicValue !== BULK_NO_CHANGE) {
      updates.epicId = bulkEpicValue === BULK_CLEAR_VALUE ? null : bulkEpicValue
    }
    if (bulkSprintValue !== BULK_NO_CHANGE) {
      updates.sprintId = bulkSprintValue === BULK_CLEAR_VALUE ? null : bulkSprintValue
    }

    if (Object.keys(updates).length === 0) {
      toast("Choose at least one field to update.", "error")
      return
    }

    setIsBulkTicketUpdating(true)
    try {
      await Promise.all(
        selectedTicketIds.map((ticketId) =>
          updateTicket.mutateAsync({
            id: ticketId,
            ...updates,
          })
        )
      )

      await refetchTickets()
      toast(
        `Updated ${selectedTicketIds.length} ticket${
          selectedTicketIds.length === 1 ? "" : "s"
        }.`
      )
      setBulkEditOpen(false)
      setSelectedTicketIds([])
      resetBulkEditFields()
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Failed to update tickets"
      toast(message, "error")
    } finally {
      setIsBulkTicketUpdating(false)
    }
  }, [
    selectedTicketIds,
    bulkStatusValue,
    bulkProjectValue,
    bulkEpicValue,
    bulkSprintValue,
    updateTicket,
    refetchTickets,
    resetBulkEditFields,
  ])

  useEffect(() => {
    if (isKanban && selectedTicketIds.length > 0) {
      setSelectedTicketIds([])
    }
  }, [isKanban, selectedTicketIds.length])

  return (
    <PageLayout>
      <EntityPageLayout
        header={
          <PageHeader
            title="Tickets"
            actions={<ViewToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} />}
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
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
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
            disableStatusFilter={isKanban}
          />
        }
      >
        {!isKanban && canEditTickets && selectedTicketIds.length > 0 ? (
          <div className="mb-4 flex items-center justify-between rounded-md border border-border bg-muted px-3 py-2">
            <span className="text-sm text-muted-foreground">
              {selectedTicketIds.length} ticket{selectedTicketIds.length === 1 ? "" : "s"} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setBulkEditOpen(true)}
                disabled={isBulkTicketUpdating}
              >
                Bulk Update
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setSelectedTicketIds([])}
                disabled={isBulkTicketUpdating}
              >
                Clear selection
              </Button>
            </div>
          </div>
        ) : null}

        <TicketsResults
          loading={loading || isBulkTicketUpdating}
          filteredTickets={filteredTickets}
          hasSearchQuery={hasSearchQuery}
          viewMode={viewMode}
          tableProps={{
            tickets: paginatedTickets,
            totalCount: ticketsPagination?.total || sortedTickets.length,
            currentPage,
            totalPages: totalPages || 1,
            onPageChange: setCurrentPage,
            startIndex,
            endIndex,
            onSelectTicket: handleSelectTicket,
            selectedTicketIds: canEditTickets ? selectedTicketIds : [],
            onToggleTicketSelection: canEditTickets ? handleToggleTicketSelection : undefined,
            onToggleSelectAllVisible: canEditTickets ? handleToggleSelectAllVisible : undefined,
            selectionDisabled: isBulkTicketUpdating,
          }}
          boardProps={{
            statuses: boardStatuses,
            onSelectTicket: handleSelectTicket,
            onKanbanDrop: handleKanbanDrop,
            onResetFilters: hasActiveFilters ? resetToolbarFilters : undefined,
            onCreateTicket: canCreateTickets ? () => setTicketDialogOpen(true) : undefined,
          }}
        />

        <TicketsDialogs
          canCreateTickets={canCreateTickets}
          isTicketDialogOpen={isTicketDialogOpen}
          setTicketDialogOpen={setTicketDialogOpen}
          selectedTicketId={selectedTicketId}
          setSelectedTicketId={setSelectedTicketId}
          showOpenSubtasksDialog={!!openSubtasksDialog}
          openSubtasksTargetStatus={openSubtasksDialog?.targetStatus ?? null}
          openSubtasks={openSubtasksDialog?.subtasks || []}
          onOpenSubtasksCancel={() => resolveOpenSubtasksDialog("cancel")}
          onOpenSubtasksKeepOpen={() => resolveOpenSubtasksDialog("keep_open")}
          onOpenSubtasksCloseAll={() => resolveOpenSubtasksDialog("close_all")}
        />

        <Dialog
          open={isBulkEditOpen}
          onOpenChange={(open) => {
            setBulkEditOpen(open)
            if (!open) {
              resetBulkEditFields()
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk update selected tickets</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Choose one or more fields to update for {selectedTicketIds.length} selected ticket
                {selectedTicketIds.length === 1 ? "" : "s"}.
              </p>
              <FilterField label="Status" id="tickets-bulk-status">
                <Select
                  id="tickets-bulk-status"
                  value={bulkStatusValue}
                  onChange={(e) => setBulkStatusValue(e.target.value)}
                  className="w-full"
                >
                  <option value={BULK_NO_CHANGE}>No change</option>
                  {statusOptions.map((statusOption) => (
                    <option key={statusOption.id} value={statusOption.id}>
                      {statusOption.label}
                    </option>
                  ))}
                </Select>
              </FilterField>
              <FilterField label="Project" id="tickets-bulk-project">
                <Select
                  id="tickets-bulk-project"
                  value={bulkProjectValue}
                  onChange={(e) => setBulkProjectValue(e.target.value)}
                  className="w-full"
                >
                  <option value={BULK_NO_CHANGE}>No change</option>
                  <option value={BULK_CLEAR_VALUE}>No project</option>
                  {projectOptions.map((projectOption) => (
                    <option key={projectOption.id} value={projectOption.id}>
                      {projectOption.name}
                    </option>
                  ))}
                </Select>
              </FilterField>
              <FilterField label="Epic" id="tickets-bulk-epic">
                <Select
                  id="tickets-bulk-epic"
                  value={bulkEpicValue}
                  onChange={(e) => setBulkEpicValue(e.target.value)}
                  className="w-full"
                >
                  <option value={BULK_NO_CHANGE}>No change</option>
                  <option value={BULK_CLEAR_VALUE}>No epic</option>
                  {epicOptions.map((epicOption) => (
                    <option key={epicOption.id} value={epicOption.id}>
                      {epicOption.name}
                    </option>
                  ))}
                </Select>
              </FilterField>
              <FilterField label="Sprint" id="tickets-bulk-sprint">
                <Select
                  id="tickets-bulk-sprint"
                  value={bulkSprintValue}
                  onChange={(e) => setBulkSprintValue(e.target.value)}
                  className="w-full"
                >
                  <option value={BULK_NO_CHANGE}>No change</option>
                  <option value={BULK_CLEAR_VALUE}>No sprint</option>
                  {sprintOptions.map((sprintOption) => (
                    <option key={sprintOption.id} value={sprintOption.id}>
                      {sprintOption.name}
                    </option>
                  ))}
                </Select>
              </FilterField>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBulkEditOpen(false)
                  resetBulkEditFields()
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleApplyBulkTicketUpdates()}
                disabled={!selectedTicketIds.length || !hasBulkEditChanges || isBulkTicketUpdating}
              >
                {isBulkTicketUpdating ? "Applying..." : "Apply updates"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </EntityPageLayout>
    </PageLayout>
  )
}
