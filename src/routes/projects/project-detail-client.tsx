"use client"

import { Link } from "react-router-dom"
import { useCallback, useDeferredValue, useMemo, useState } from "react"
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
import { Card } from "@client/components/ui/card"
import { Button } from "@client/components/ui/button"
import { FormDialogShell } from "@client/components/ui/form-dialog-shell"
import { ProjectForm } from "@client/components/forms/project-form"
import { Input } from "@client/components/ui/input"
import { Select } from "@client/components/ui/select"
import { FilterField } from "@client/components/ui/filter-field"
import { PriorityPill } from "@client/components/tickets/priority-pill"
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

export default function ProjectDetailClient({
  projectId,
  initialProject,
}: ProjectDetailClientProps) {
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
  const [excludedStatuses, setExcludedStatuses] = useState<string[]>(() => [...DEFAULT_EXCLUDED_STATUSES])

  const deferredSearchQuery = useDeferredValue(searchQuery)

  const toggleStatusExcluded = useCallback((statusKey: string) => {
    const key = statusKey.trim().toLowerCase()
    setExcludedStatuses((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    )
  }, [])

  const { data: tickets = [], isLoading: ticketsLoading } = useTickets({
    projectId: project?.id,
    epicId: epicFilter !== "all" ? epicFilter : undefined,
    sprintId: sprintFilter !== "all" ? sprintFilter : undefined,
    assigneeId: assigneeFilter !== "all" ? assigneeFilter : undefined,
    requestedById: reporterFilter !== "all" ? reporterFilter : undefined,
    sqaAssigneeId: sqaFilter !== "all" ? sqaFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    excludeStatuses: excludedStatuses.length > 0 ? excludedStatuses : undefined,
    q: deferredSearchQuery.trim() || undefined,
    excludeSubtasks: true,
    limit: 500,
    enabled: !!project?.id,
  })
  const { statuses: ticketStatuses, statusMap } = useTicketStatuses()
  const { epics } = useEpics()
  const { sprints } = useSprints()
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

  const statusOptions = useMemo(
    () =>
      ticketStatuses
        .filter((s) => !isArchivedStatus(s.key))
        .map((s) => ({ id: s.key, label: s.label })),
    [ticketStatuses]
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

  return (
    <PageLayout>
      <EntityPageLayout
        header={
          <PageHeader
          title={project?.name || "Project"}
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
          <div className="space-y-4">
            <Card className="p-5 shadow-none">
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
            </Card>

            <Card className="p-5 shadow-none">
              <h2 className="text-sm font-semibold text-foreground">Overview</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {project.description || "No project description provided."}
              </p>
            </Card>

            <Card className="p-5 shadow-none">
              <h2 className="text-sm font-semibold text-foreground">Tickets</h2>
              <div className="mt-3 flex flex-wrap gap-6">
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
                  <div className={cn("relative flex min-h-9 min-w-[120px] items-center rounded-md border border-input bg-form-bg px-3")}>
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
                              <Link
                                to={`/tickets/${ticket.id}`}
                                className="text-sm font-normal text-foreground hover:underline"
                              >
                                {ticket.title}
                              </Link>
                            </TableCell>
                            <TableCell className="py-2">
                              {statusInfo ? (
                                <StatusPill label={statusInfo.label} color={statusInfo.color} />
                              ) : (
                                <span className="text-sm text-foreground">{ticket.status}</span>
                              )}
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
            </Card>
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
