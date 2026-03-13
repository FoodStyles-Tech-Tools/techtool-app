"use client"

import { useCallback, useDeferredValue, useMemo, useState } from "react"
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/20/solid"
import { TableCellsIcon, ViewColumnsIcon } from "@heroicons/react/24/outline"
import { useProject } from "@client/hooks/use-projects"
import { useDepartments } from "@client/hooks/use-departments"
import { useUsers } from "@client/hooks/use-users"
import { usePermissions } from "@client/hooks/use-permissions"
import { useEpics } from "@client/hooks/use-epics"
import { useSprints } from "@client/hooks/use-sprints"
import { useTicketStatuses } from "@client/hooks/use-ticket-statuses"
import {
  useTickets,
  useUpdateTicket,
  useUpdateTicketWithReasonComment,
} from "@client/features/tickets/hooks/use-tickets"
import { useTicketBoardActions } from "@client/features/tickets/hooks/use-ticket-board-actions"
import { useOpenSubtasksDialog } from "@client/features/tickets/hooks/use-open-subtasks-dialog"
import {
  useDeployRounds,
  useCreateDeployRound,
  useUpdateDeployRound,
  useDeleteDeployRound,
} from "@client/features/projects/hooks/use-deploy-rounds"
import { DEFAULT_EXCLUDED_STATUSES } from "@client/hooks/use-tickets-filters"
import { StatusFilterDropdown } from "@client/components/tickets/status-filter-dropdown"
import { normalizeStatusKey, isArchivedStatus } from "@shared/ticket-statuses"
import { ROWS_PER_PAGE } from "@shared/ticket-constants"
import { cn } from "@client/lib/utils"
import { PageHeader } from "@client/components/ui/page-header"
import { Breadcrumb } from "@client/components/ui/breadcrumb"
import { PageLayout } from "@client/components/ui/page-layout"
import { LoadingIndicator } from "@client/components/ui/loading-indicator"
import { EntityPageLayout } from "@client/components/ui/entity-page-layout"
import { DataState } from "@client/components/ui/data-state"
import { Button } from "@client/components/ui/button"
import { FormDialogShell } from "@client/components/ui/form-dialog-shell"
import { ProjectForm } from "@client/components/forms/project-form"
import { Input } from "@client/components/ui/input"
import { Select } from "@client/components/ui/select"
import { FilterField } from "@client/components/ui/filter-field"
import { FilterBar } from "@client/components/ui/filter-bar"
import { PriorityPill } from "@client/components/tickets/priority-pill"
import { TicketTypeIcon } from "@client/components/ticket-type-select"
import { StatusPill } from "@client/components/tickets/status-pill"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table"
import { toast } from "@client/components/ui/toast"
import { useTicketPreview } from "@client/features/tickets/context/ticket-preview-context"
import { TicketsBoard } from "@client/features/tickets/components/tickets-board"
import { TicketsDialogs } from "@client/features/tickets/components/tickets-dialogs"
import { DeployRoundFormDialog } from "@client/components/deploy-rounds/deploy-round-form-dialog"
import { DeployRoundManager } from "@client/components/deploy-rounds/deploy-round-manager"
import type { Project } from "@shared/types"
import type { Ticket, DeployRoundChecklistItem } from "@shared/types"
import { Checkbox } from "@client/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"

type ViewMode = "table" | "kanban"

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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

type ProjectDetailClientProps = {
  projectId: string
  initialProject?: { project: Project }
}

const PRIORITY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
] as const

const TYPE_OPTIONS = [
  { id: "bug", label: "Bug" },
  { id: "request", label: "Request" },
  { id: "task", label: "Task" },
  { id: "subtask", label: "Subtask" },
] as const

export default function ProjectDetailClient({
  projectId,
  initialProject,
}: ProjectDetailClientProps) {
  const { openPreview } = useTicketPreview()
  const { flags, user: currentUser } = usePermissions()
  const { data, isLoading } = useProject(projectId, {
    initialData: initialProject,
  })
  const { departments } = useDepartments()
  const { data: usersData } = useUsers()
  const [isEditOpen, setEditOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [currentPage, setCurrentPage] = useState(1)

  const project = data?.project
  const users = useMemo(() => usersData || [], [usersData])
  const canEditProjects = flags?.canEditProjects ?? false
  const ownerLabel = project?.owner?.name || project?.owner?.email || "Unassigned"
  const requestersLabel = project?.requesters?.length
    ? project.requesters.map((person) => person.name || person.email).join(", ")
    : "No requesters"
  const collaboratorsLabel = project?.collaborators?.length
    ? project.collaborators.map((person) => person.name || person.email).join(", ")
    : "No collaborators"

  const [searchQuery, setSearchQuery] = useState("")
  const [sprintFilter, setSprintFilter] = useState<string>("all")
  const [epicFilter, setEpicFilter] = useState<string>("all")
  const [deployRoundFilter, setDeployRoundFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [reporterFilter, setReporterFilter] = useState<string>("all")
  const [sqaFilter, setSqaFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [excludedStatuses, setExcludedStatuses] = useState<string[]>(() => [...DEFAULT_EXCLUDED_STATUSES])
  const [isCreateDeployRoundOpen, setCreateDeployRoundOpen] = useState(false)
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([])
  const [isBulkDeployRoundOpen, setBulkDeployRoundOpen] = useState(false)
  const [bulkDeployRoundId, setBulkDeployRoundId] = useState<string>("")

  const deferredSearchQuery = useDeferredValue(searchQuery)

  const toggleStatusExcluded = useCallback((statusKey: string) => {
    const key = statusKey.trim().toLowerCase()
    setExcludedStatuses((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    )
  }, [])

  const isKanban = viewMode === "kanban"

  const { statuses: ticketStatuses, statusMap } = useTicketStatuses()
  const { epics } = useEpics()
  const { sprints } = useSprints()
  const { data: deployRounds = [], isLoading: deployRoundsLoading } = useDeployRounds(projectId)
  const createDeployRound = useCreateDeployRound()
  const updateDeployRound = useUpdateDeployRound()
  const deleteDeployRound = useDeleteDeployRound()
  const statusOptions = useMemo(
    () =>
      ticketStatuses
        .filter((s) => !isArchivedStatus(s.key))
        .map((s) => ({ id: s.key, label: s.label })),
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

  const defaultExcludedSet = useMemo(() => new Set(DEFAULT_EXCLUDED_STATUSES), [])

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim() !== "") return true
    if (!isKanban) {
      const excludedSetForActive = new Set(excludedStatuses)
      if (
        excludedSetForActive.size !== defaultExcludedSet.size ||
        [...excludedSetForActive].some((s) => !defaultExcludedSet.has(s))
      ) {
        return true
      }
    }
    if (assigneeFilter !== "all") return true
    if (reporterFilter !== "all") return true
    if (sqaFilter !== "all") return true
    if (priorityFilter !== "all") return true
    if (typeFilter !== "all") return true
    if (epicFilter !== "all") return true
    if (sprintFilter !== "all") return true
    if (deployRoundFilter !== "all") return true
    return false
  }, [
    assigneeFilter,
    defaultExcludedSet,
    epicFilter,
    excludedStatuses,
    priorityFilter,
    typeFilter,
    reporterFilter,
    searchQuery,
    sprintFilter,
    sqaFilter,
    deployRoundFilter,
  ])

  const handleResetTicketFilters = useCallback(() => {
    setSearchQuery("")
    setSprintFilter("all")
    setEpicFilter("all")
    setDeployRoundFilter("all")
    setAssigneeFilter("all")
    setReporterFilter("all")
    setSqaFilter("all")
    setPriorityFilter("all")
    setTypeFilter("all")
    setExcludedStatuses([...DEFAULT_EXCLUDED_STATUSES])
    setCurrentPage(1)
  }, [])

  const { data: tickets = [], pagination: ticketsPagination, isLoading: ticketsLoading } = useTickets({
    projectId: project?.id,
    epicId: epicFilter !== "all" ? epicFilter : undefined,
    sprintId: sprintFilter !== "all" ? sprintFilter : undefined,
    deployRoundId: deployRoundFilter !== "all" ? deployRoundFilter : undefined,
    assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
    requestedById: reporterFilter !== "all" ? reporterFilter : undefined,
    sqaAssigneeId: sqaFilter !== "all" ? sqaFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    includeStatuses: statusOptions.length > 0 ? includeStatuses : undefined,
    q: deferredSearchQuery.trim() || undefined,
    excludeSubtasks: true,
    limit: isKanban ? 500 : ROWS_PER_PAGE,
    page: isKanban ? 1 : currentPage,
    enabled: !!project?.id,
  })

  const updateTicket = useUpdateTicket()
  const updateTicketWithReasonComment = useUpdateTicketWithReasonComment()
  const { openSubtasksDialog, askHowToHandleOpenSubtasks, resolveOpenSubtasksDialog } = useOpenSubtasksDialog()

  const {
    selectedTicketId,
    setSelectedTicketId,
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
    handleKanbanDrop,
  } = useTicketBoardActions({
    allTickets: tickets,
    projectFilter: project?.id ?? "all",
    askHowToHandleOpenSubtasks,
    updateTicket,
    updateTicketWithReasonComment,
  })
  const epicOptionsAsc = useMemo(
    () =>
      [...epics].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      ),
    [epics]
  )
  const sprintOptionsAsc = useMemo(
    () =>
      [...sprints].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      ),
    [sprints]
  )

  const userOptions = useMemo(
    () =>
      [...users].sort((a, b) =>
        (a.name || a.email || "").localeCompare(b.name || b.email || "", undefined, {
          sensitivity: "base",
        })
      ),
    [users]
  )

  const sortedTicketsForTable = useMemo(() => {
    const order = [...ticketStatuses].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const orderMap = new Map(order.map((s, i) => [s.key, i]))
    return [...tickets].sort((a, b) => {
      const ai = orderMap.get(normalizeStatusKey(a.status)) ?? 999
      const bi = orderMap.get(normalizeStatusKey(b.status)) ?? 999
      if (ai !== bi) return ai - bi
      return (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" })
    })
  }, [tickets, ticketStatuses])

  const totalPages = Math.max(1, ticketsPagination?.totalPages || 1)
  const totalCount = ticketsPagination?.total ?? sortedTicketsForTable.length
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE

  const handleSelectTicket = useCallback(
    (ticketId: string) => {
      const ticket = tickets.find((t) => t.id === ticketId)
      const slug = ticket
        ? (ticket.displayId || ticketId.slice(0, 8)).toLowerCase()
        : ticketId.slice(0, 8).toLowerCase()
      openPreview({ ticketId, slug })
    },
    [tickets, openPreview]
  )

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleToggleTicketSelection = useCallback((ticketId: string, checked: boolean) => {
    setSelectedTicketIds((prev) =>
      checked ? [...prev, ticketId] : prev.filter((id) => id !== ticketId)
    )
  }, [])

  const handleToggleSelectAllVisible = useCallback(
    (checked: boolean) => {
      const visibleIds = sortedTicketsForTable.map((t) => t.id)
      setSelectedTicketIds((prev) => {
        if (!checked) {
          return prev.filter((id) => !visibleIds.includes(id))
        }
        const next = new Set([...prev, ...visibleIds])
        return Array.from(next)
      })
    },
    [sortedTicketsForTable]
  )

  const handleBulkAssignDeployRound = useCallback(async () => {
    if (!bulkDeployRoundId || selectedTicketIds.length === 0) return
    try {
      await Promise.all(
        selectedTicketIds.map((ticketId) =>
          updateTicket.mutateAsync({ id: ticketId, deployRoundId: bulkDeployRoundId })
        )
      )
      toast(
        `Added ${selectedTicketIds.length} ticket${
          selectedTicketIds.length === 1 ? "" : "s"
        } to deploy round`
      )
      setBulkDeployRoundOpen(false)
      setSelectedTicketIds([])
      setBulkDeployRoundId("")
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("Error assigning deploy round in bulk:", error)
      toast(error?.message || "Failed to update tickets", "error")
    }
  }, [bulkDeployRoundId, selectedTicketIds, updateTicket])

  const handleBulkRemoveDeployRound = useCallback(async () => {
    if (selectedTicketIds.length === 0) return
    try {
      await Promise.all(
        selectedTicketIds.map((ticketId) =>
          updateTicket.mutateAsync({ id: ticketId, deployRoundId: null })
        )
      )
      toast(
        `Removed deploy round from ${selectedTicketIds.length} ticket${
          selectedTicketIds.length === 1 ? "" : "s"
        }`
      )
      setSelectedTicketIds([])
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("Error removing deploy round in bulk:", error)
      toast(error?.message || "Failed to update tickets", "error")
    }
  }, [selectedTicketIds, updateTicket])

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    setCurrentPage(1)
  }, [])

  const handleCreateDeployRound = useCallback(
    async (values: { name: string; checklist: DeployRoundChecklistItem[] }) => {
      if (!projectId) return
      try {
        const result = await createDeployRound.mutateAsync({
          projectId,
          name: values.name,
          checklist: values.checklist,
        })
        setDeployRoundFilter(result.id)
        toast("Deploy round created successfully")
      } catch (error: any) {
        console.error("Error creating deploy round:", error)
        toast(error?.message || "Failed to create deploy round", "error")
        throw error
      }
    },
    [projectId, createDeployRound]
  )

  const handleUpdateDeployRound = useCallback(
    async (deployRoundId: string, data: { name?: string; checklist?: DeployRoundChecklistItem[] }) => {
      if (!projectId) return
      try {
        await updateDeployRound.mutateAsync({
          projectId,
          deployRoundId,
          ...data,
        })
      } catch (error: any) {
        console.error("Error updating deploy round:", error)
        throw error
      }
    },
    [projectId, updateDeployRound]
  )

  const handleDeleteDeployRound = useCallback(
    async (deployRoundId: string) => {
      if (!projectId) return
      try {
        await deleteDeployRound.mutateAsync({
          projectId,
          deployRoundId,
        })
        if (deployRoundFilter === deployRoundId) {
          setDeployRoundFilter("all")
        }
      } catch (error: any) {
        console.error("Error deleting deploy round:", error)
        throw error
      }
    },
    [projectId, deleteDeployRound, deployRoundFilter]
  )

function hexWithAlpha(hex: string, alphaHex = "1a"): string {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex
  return `#${normalized}${alphaHex}`
}

function getTypeColor(type: string | null | undefined): string {
  if (type === "bug") return "#ef4444" // red-500
  if (type === "request") return "#3b82f6" // blue-500
  // default to task color
  return "#f97316" // orange-500
}

  return (
    <PageLayout>
      <EntityPageLayout
        header={
          <PageHeader
          breadcrumb={
            <Breadcrumb
              items={[
                { label: "Projects", href: "/projects" },
                { label: project?.name || "Project" },
              ]}
            />
          }
          actions={
            <div className="flex items-center gap-2">
              <ViewToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} />
              {canEditProjects && (
                <Button
                  variant="outline"
                  onClick={() => setCreateDeployRoundOpen(true)}
                >
                  <PlusIcon className="mr-1.5 h-4 w-4" />
                  New Deploy Round
                </Button>
              )}
              {canEditProjects ? (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  Edit Project
                </Button>
              ) : null}
            </div>
          }
        />
      }
    >
      <DataState
        loading={isLoading}
        isEmpty={!isLoading && !project}
        loadingTitle="Loading project"
        loadingDescription="Project details are being prepared."
        emptyTitle="Project not found"
        emptyDescription="The requested project could not be loaded."
      >
        {project ? (
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-foreground">Details</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Status</dt>
                  <dd className="mt-1 text-sm capitalize text-foreground">{project.status}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Department</dt>
                  <dd className="mt-1 text-sm text-foreground">{project.department?.name || "No department"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Require SQA</dt>
                  <dd className="mt-1 text-sm text-foreground">{project.require_sqa ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Created</dt>
                  <dd className="mt-1 text-sm text-foreground">{formatDate(project.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Owner</dt>
                  <dd className="mt-1 text-sm text-foreground">{ownerLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Requesters</dt>
                  <dd className="mt-1 text-sm text-foreground">{requestersLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">Collaborators</dt>
                  <dd className="mt-1 text-sm text-foreground">{collaboratorsLabel}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-foreground">Overview</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {project.description || "No project description provided."}
              </p>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-foreground">Tickets</h2>
              <div className="mt-3">
                <FilterBar
                  hasActiveFilters={hasActiveFilters}
                  onResetFilters={handleResetTicketFilters}
                  filters={
                    <>
                      <FilterField label="Search" id="project-tickets-search">
                        <div className="relative w-80 min-w-[200px]">
                          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="project-tickets-search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="By ID, title, or description"
                            className="h-9 pl-8"
                          />
                        </div>
                      </FilterField>
                      <FilterField label="Status" id="project-status-filter">
                        <StatusFilterDropdown
                          id="project-status-filter"
                          statusOptions={statusOptions}
                          excludedStatuses={isKanban ? [] : excludedStatuses}
                          toggleStatusExcluded={isKanban ? () => {} : toggleStatusExcluded}
                          statusMap={statusMap}
                          disabled={isKanban}
                        />
                      </FilterField>
                      <FilterField label="Assignee" id="project-assignee-filter">
                        <Select
                          id="project-assignee-filter"
                          value={assigneeFilter}
                          onChange={(e) => setAssigneeFilter(e.target.value)}
                          className="min-w-[140px]"
                        >
                          <option value="all">All</option>
                          {currentUser?.id ? (
                            <option value={currentUser.id}>Assigned to me</option>
                          ) : null}
                          <option value="unassigned">Unassigned</option>
                        </Select>
                      </FilterField>
                      <FilterField label="Reporter" id="project-reporter-filter">
                        <Select
                          id="project-reporter-filter"
                          value={reporterFilter}
                          onChange={(e) => setReporterFilter(e.target.value)}
                          className="min-w-[140px]"
                        >
                          <option value="all">All</option>
                          {userOptions.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name || u.email}
                            </option>
                          ))}
                        </Select>
                      </FilterField>
                      <FilterField label="SQA" id="project-sqa-filter">
                        <Select
                          id="project-sqa-filter"
                          value={sqaFilter}
                          onChange={(e) => setSqaFilter(e.target.value)}
                          className="min-w-[140px]"
                        >
                          <option value="all">All</option>
                          <option value="unassigned">Unassigned</option>
                          {userOptions.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name || u.email}
                            </option>
                          ))}
                        </Select>
                      </FilterField>
                      <FilterField label="Priority" id="project-priority-filter">
                        <div
                          className={cn(
                            "relative flex min-h-9 min-w-[120px] items-center rounded-md border border-input bg-form-bg px-3"
                          )}
                        >
                          {priorityFilter !== "all" ? (
                            <PriorityPill priority={priorityFilter} className="pointer-events-none shrink-0" />
                          ) : (
                            <span className="pointer-events-none text-sm text-muted-foreground">All</span>
                          )}
                          <Select
                            id="project-priority-filter"
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          >
                            <option value="all">All</option>
                            {PRIORITY_OPTIONS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </FilterField>
                      <FilterField label="Type" id="project-type-filter">
                        <Select
                          id="project-type-filter"
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="min-w-[140px]"
                        >
                          <option value="all">All</option>
                          {TYPE_OPTIONS.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </Select>
                      </FilterField>
                      <FilterField label="Epic" id="project-epic-filter">
                        <Select
                          id="project-epic-filter"
                          value={epicFilter}
                          onChange={(e) => setEpicFilter(e.target.value)}
                          className="min-w-[160px]"
                        >
                          <option value="all">All</option>
                          <option value="no_epic">No epic</option>
                          {epicOptionsAsc.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                        </Select>
                      </FilterField>
                      <FilterField label="Sprint" id="project-sprint-filter">
                        <Select
                          id="project-sprint-filter"
                          value={sprintFilter}
                          onChange={(e) => setSprintFilter(e.target.value)}
                          className="min-w-[160px]"
                        >
                          <option value="all">All</option>
                          <option value="no_sprint">No sprint</option>
                          {sprintOptionsAsc.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </Select>
                      </FilterField>
                      <FilterField label="Deploy Round" id="project-deploy-round-filter">
                        <Select
                          id="project-deploy-round-filter"
                          value={deployRoundFilter}
                          onChange={(e) => setDeployRoundFilter(e.target.value)}
                          className="min-w-[160px]"
                        >
                          <option value="all">All</option>
                          <option value="no_deploy_round">No deploy round</option>
                          {deployRounds.map((dr) => (
                            <option key={dr.id} value={dr.id}>
                              {dr.name}
                            </option>
                          ))}
                        </Select>
                      </FilterField>
                    </>
                  }
                />
              </div>

              {deployRoundFilter !== "all" && deployRoundFilter !== "no_deploy_round" && canEditProjects && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Deploy Round Management</h3>
                  {(() => {
                    const selectedDeployRound = deployRounds.find((dr) => dr.id === deployRoundFilter)
                    if (!selectedDeployRound) return null
                    return (
                      <DeployRoundManager
                        deployRound={selectedDeployRound}
                        onUpdate={handleUpdateDeployRound}
                        onDelete={handleDeleteDeployRound}
                      />
                    )
                  })()}
                </div>
              )}

              {ticketsLoading ? (
                <div className="mt-4 rounded-lg border border-border bg-card py-8">
                  <LoadingIndicator variant="block" label="Loading tickets…" />
                </div>
              ) : isKanban ? (
                <div className="mt-4">
                  <TicketsBoard
                    tickets={sortedTicketsForTable}
                    statuses={ticketStatuses}
                    excludedStatuses={excludedStatuses}
                    loading={ticketsLoading}
                    hasSearchQuery={deferredSearchQuery.trim().length > 0}
                    onSelectTicket={handleSelectTicket}
                    onKanbanDrop={handleKanbanDrop}
                    onResetFilters={hasActiveFilters ? handleResetTicketFilters : undefined}
                  />
                </div>
              ) : sortedTicketsForTable.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No tickets match the filters.</p>
              ) : (
                <>
                  {selectedTicketIds.length > 0 && (
                    <div className="mt-4 flex items-center justify-between rounded-md border border-border bg-muted px-3 py-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedTicketIds.length} ticket
                        {selectedTicketIds.length === 1 ? "" : "s"} selected
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setBulkDeployRoundOpen(true)}
                          disabled={!deployRounds.length}
                        >
                          Add to Deploy Round
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => void handleBulkRemoveDeployRound()}
                        >
                          Remove From Deploy Round
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setSelectedTicketIds([])}
                        >
                          Clear selection
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-8 px-2 py-2">
                            <Checkbox
                              checked={
                                sortedTicketsForTable.length > 0 &&
                                sortedTicketsForTable.every((t) =>
                                  selectedTicketIds.includes(t.id)
                                )
                              }
                              onChange={(event) =>
                                handleToggleSelectAllVisible(event.target.checked)
                              }
                              aria-label="Select all tickets"
                            />
                          </TableHead>
                          <TableHead className="h-9 py-2 text-muted-foreground">ID</TableHead>
                          <TableHead className="h-9 py-2 text-muted-foreground">Title</TableHead>
                          <TableHead className="h-9 py-2 text-muted-foreground">Status</TableHead>
                          <TableHead className="h-9 py-2 text-muted-foreground">Type</TableHead>
                          <TableHead className="h-9 py-2 text-muted-foreground">Priority</TableHead>
                          <TableHead className="h-9 py-2 text-muted-foreground">Reporter</TableHead>
                          <TableHead className="h-9 py-2 text-muted-foreground">Assignee</TableHead>
                          <TableHead className="h-9 py-2 text-muted-foreground">SQA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedTicketsForTable.map((ticket) => {
                          const statusInfo = statusMap.get(normalizeStatusKey(ticket.status))
                          const reporterLabel = ticket.requestedBy?.name || ticket.requestedBy?.email || "-"
                          const assigneeLabel = ticket.assignee?.name || ticket.assignee?.email || "-"
                          const sqaLabel = ticket.sqaAssignee?.name || ticket.sqaAssignee?.email || "-"
                          const isSelected = selectedTicketIds.includes(ticket.id)
                          return (
                            <TableRow key={ticket.id}>
                              <TableCell className="px-2 py-2">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={(event) =>
                                    handleToggleTicketSelection(ticket.id, event.target.checked)
                                  }
                                  aria-label={`Select ticket ${
                                    ticket.displayId || ticket.id.slice(0, 8)
                                  }`}
                                />
                              </TableCell>
                              <TableCell className="py-2 text-sm text-muted-foreground">
                                {ticket.displayId || ticket.id.slice(0, 8)}
                              </TableCell>
                              <TableCell className="py-2">
                                <button
                                  type="button"
                                  onClick={() => handleSelectTicket(ticket.id)}
                                  className="text-sm font-normal text-primary underline"
                                >
                                  {ticket.title}
                                </button>
                              </TableCell>
                              <TableCell className="py-2">
                                {statusInfo ? (
                                  <StatusPill label={statusInfo.label} color={statusInfo.color} />
                                ) : (
                                  <span className="text-sm text-foreground">{ticket.status}</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2 text-sm text-foreground">
                                {(() => {
                                  const rawType = ticket.type
                                  const type = !rawType || rawType === "subtask" ? "task" : rawType
                                  const typeColor = getTypeColor(type)
                                  return (
                                    <span
                                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium capitalize"
                                      style={{
                                        backgroundColor: hexWithAlpha(typeColor, "1a"),
                                        borderColor: hexWithAlpha(typeColor, "40"),
                                      }}
                                    >
                                      <TicketTypeIcon type={type} color={typeColor} />
                                      <span className="text-foreground">{type}</span>
                                    </span>
                                  )
                                })()}
                              </TableCell>
                              <TableCell className="py-2 text-sm text-foreground">
                                <PriorityPill priority={ticket.priority} />
                              </TableCell>
                              <TableCell className="py-2 text-sm text-foreground">
                                {reporterLabel}
                              </TableCell>
                              <TableCell className="py-2 text-sm text-foreground">
                                {assigneeLabel}
                              </TableCell>
                              <TableCell className="py-2 text-sm text-foreground">{sqaLabel}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of {totalCount} tickets
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        ) : null}
      </DataState>

      <TicketsDialogs
        canCreateTickets={false}
        isTicketDialogOpen={false}
        setTicketDialogOpen={() => {}}
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
        openSubtasks={openSubtasksDialog?.subtasks ?? []}
        onOpenSubtasksCancel={() => resolveOpenSubtasksDialog("cancel")}
        onOpenSubtasksKeepOpen={() => resolveOpenSubtasksDialog("keep_open")}
        onOpenSubtasksCloseAll={() => resolveOpenSubtasksDialog("close_all")}
        showReturnedReasonDialog={showReturnedReasonDialog}
        returnedReason={returnedReason}
        setReturnedReason={setReturnedReason}
        onReturnedReasonCancel={handleReturnedReasonCancel}
        onReturnedReasonConfirm={handleReturnedReasonConfirm}
      />

      <Dialog open={isBulkDeployRoundOpen} onOpenChange={setBulkDeployRoundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add tickets to deploy round</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select a deploy round to assign {selectedTicketIds.length} selected ticket
              {selectedTicketIds.length === 1 ? "" : "s"}.
            </p>
            <Select
              value={bulkDeployRoundId}
              onChange={(e) => setBulkDeployRoundId(e.target.value)}
              className="w-full"
            >
              <option value="">Select deploy round</option>
              {deployRounds.map((dr) => (
                <option key={dr.id} value={dr.id}>
                  {dr.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDeployRoundOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleBulkAssignDeployRound()}
              disabled={!bulkDeployRoundId || !selectedTicketIds.length}
            >
              Add to Deploy Round
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FormDialogShell
        open={isEditOpen}
        onOpenChange={setEditOpen}
        title="Edit Project"
        formId="project-detail-edit-form"
        submitLabel="Save"
      >
        {project ? (
          <ProjectForm
            formId="project-detail-edit-form"
            hideSubmitButton
            departments={departments}
            users={users}
            initialData={{
              id: project.id,
              name: project.name,
              description: project.description || "",
              status: project.status as "active" | "inactive",
              require_sqa: project.require_sqa,
              department_id: project.department?.id,
              owner_id: project.owner?.id ?? "",
              links: project.links || [],
              requester_ids: project.requester_ids || project.requesters.map((item) => item.id),
              collaborator_ids: project.collaborator_ids || project.collaborators.map((item) => item.id),
            }}
            onSuccess={() => {
              setEditOpen(false)
              toast("Project updated")
              window.location.reload()
            }}
          />
        ) : null}
      </FormDialogShell>

      <DeployRoundFormDialog
        open={isCreateDeployRoundOpen}
        onOpenChange={setCreateDeployRoundOpen}
        onSubmit={handleCreateDeployRound}
        title="Create Deploy Round"
        description="Create a new deploy round with a checklist for tracking deployment tasks."
        submitLabel="Create"
      />
      </EntityPageLayout>
    </PageLayout>
  )
}
