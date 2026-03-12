"use client"

import { useCallback, useDeferredValue, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid"
import { useProject } from "@client/hooks/use-projects"
import { useDepartments } from "@client/hooks/use-departments"
import { useUsers } from "@client/hooks/use-users"
import { usePermissions } from "@client/hooks/use-permissions"
import { useEpics } from "@client/hooks/use-epics"
import { useSprints } from "@client/hooks/use-sprints"
import { useTicketStatuses } from "@client/hooks/use-ticket-statuses"
import { useTickets } from "@client/features/tickets/hooks/use-tickets"
import { DEFAULT_EXCLUDED_STATUSES } from "@client/hooks/use-tickets-filters"
import { StatusFilterDropdown } from "@client/components/tickets/status-filter-dropdown"
import { normalizeStatusKey, isArchivedStatus } from "@shared/ticket-statuses"
import { cn } from "@client/lib/utils"
import { PageHeader } from "@client/components/ui/page-header"
import { Breadcrumb } from "@client/components/ui/breadcrumb"
import { PageLayout } from "@client/components/ui/page-layout"
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
import type { Project } from "@shared/types"
import type { Ticket } from "@shared/types"

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
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [reporterFilter, setReporterFilter] = useState<string>("all")
  const [sqaFilter, setSqaFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [excludedStatuses, setExcludedStatuses] = useState<string[]>(() => [...DEFAULT_EXCLUDED_STATUSES])

  const deferredSearchQuery = useDeferredValue(searchQuery)

  const toggleStatusExcluded = useCallback((statusKey: string) => {
    const key = statusKey.trim().toLowerCase()
    setExcludedStatuses((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    )
  }, [])

  const { statuses: ticketStatuses, statusMap } = useTicketStatuses()
  const { epics } = useEpics()
  const { sprints } = useSprints()
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
      statusOptions
        .filter((o) => !excludedSet.has(o.id.toLowerCase()))
        .map((o) => o.id),
    [statusOptions, excludedSet]
  )

  const defaultExcludedSet = useMemo(() => new Set(DEFAULT_EXCLUDED_STATUSES), [])

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim() !== "") return true
    const excludedSetForActive = new Set(excludedStatuses)
    if (
      excludedSetForActive.size !== defaultExcludedSet.size ||
      [...excludedSetForActive].some((s) => !defaultExcludedSet.has(s))
    ) {
      return true
    }
    if (assigneeFilter !== "all") return true
    if (reporterFilter !== "all") return true
    if (sqaFilter !== "all") return true
    if (priorityFilter !== "all") return true
    if (typeFilter !== "all") return true
    if (epicFilter !== "all") return true
    if (sprintFilter !== "all") return true
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
  ])

  const handleResetTicketFilters = useCallback(() => {
    setSearchQuery("")
    setSprintFilter("all")
    setEpicFilter("all")
    setAssigneeFilter("all")
    setReporterFilter("all")
    setSqaFilter("all")
    setPriorityFilter("all")
    setTypeFilter("all")
    setExcludedStatuses([...DEFAULT_EXCLUDED_STATUSES])
  }, [])

  const { data: tickets = [], isLoading: ticketsLoading } = useTickets({
    projectId: project?.id,
    epicId: epicFilter !== "all" ? epicFilter : undefined,
    sprintId: sprintFilter !== "all" ? sprintFilter : undefined,
    assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
    requestedById: reporterFilter !== "all" ? reporterFilter : undefined,
    sqaAssigneeId: sqaFilter !== "all" ? sqaFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    includeStatuses: statusOptions.length > 0 ? includeStatuses : undefined,
    q: deferredSearchQuery.trim() || undefined,
    excludeSubtasks: true,
    limit: 500,
    enabled: !!project?.id,
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
            <>
              <Button asChild>
                <Link to={`/tickets?projectId=${projectId}`}>
                  Open Tickets
                </Link>
              </Button>
              {canEditProjects ? (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  Edit Project
                </Button>
              ) : null}
            </>
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
                          excludedStatuses={excludedStatuses}
                          toggleStatusExcluded={toggleStatusExcluded}
                          statusMap={statusMap}
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
                    </>
                  }
                />
              </div>
              {ticketsLoading ? (
                <p className="mt-4 text-sm text-muted-foreground">Loading tickets…</p>
              ) : sortedTicketsForTable.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No tickets match the filters.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
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
                        return (
                          <TableRow key={ticket.id}>
                            <TableCell className="py-2 text-sm text-muted-foreground">
                              {ticket.displayId || ticket.id.slice(0, 8)}
                            </TableCell>
                            <TableCell className="py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openPreview({
                                    ticketId: ticket.id,
                                    slug: (ticket.displayId || ticket.id).toLowerCase(),
                                  })
                                }
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
                            <TableCell className="py-2 text-sm text-foreground">{reporterLabel}</TableCell>
                            <TableCell className="py-2 text-sm text-foreground">{assigneeLabel}</TableCell>
                            <TableCell className="py-2 text-sm text-foreground">{sqaLabel}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </DataState>

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
      </EntityPageLayout>
    </PageLayout>
  )
}
