"use client"

import { useMemo } from "react"
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid"
import { Input } from "@client/components/ui/input"
import { Select } from "@client/components/ui/select"
import { FilterBar } from "@client/components/ui/filter-bar"
import { FilterField } from "@client/components/ui/filter-field"
import { Button } from "@client/components/ui/button"
import { StatusPill } from "@client/components/tickets/status-pill"
import { StatusFilterDropdown } from "@client/components/tickets/status-filter-dropdown"
import { PriorityPill } from "@client/components/tickets/priority-pill"
import { normalizeStatusKey } from "@shared/ticket-statuses"
import { cn } from "@client/lib/utils"

interface ProjectOption {
  id: string
  name: string
}

interface StatusOption {
  id: string
  label: string
}

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface EpicSprintOption {
  id: string
  name: string
}

export interface TicketsToolbarProps {
  searchQuery: string
  setSearchQuery: (value: string) => void
  projectFilter: string
  setProjectFilter: (value: string) => void
  projectOptions: ProjectOption[]
  statusOptions: StatusOption[]
  excludedStatuses: string[]
  toggleStatusExcluded: (statusKey: string) => void
  assigneeFilter: string
  setAssigneeFilter: (value: string) => void
  reporterFilter: string
  setReporterFilter: (value: string) => void
  reporterOptions: UserOption[]
  sqaFilter: string
  setSqaFilter: (value: string) => void
  sqaOptions: UserOption[]
  priorityFilter: string
  setPriorityFilter: (value: string) => void
  priorityOptions: StatusOption[]
  typeFilter: string
  setTypeFilter: (value: string) => void
  epicFilter: string
  setEpicFilter: (value: string) => void
  epicOptions: EpicSprintOption[]
  sprintFilter: string
  setSprintFilter: (value: string) => void
  sprintOptions: EpicSprintOption[]
  resetToolbarFilters: () => void
  /** When provided, used instead of computing from filter values (e.g. "differs from session default"). */
  hasActiveFilters?: boolean
  currentUserId: string | null
  /** When provided, status filter displays as StatusPill when a status is selected. */
  statusMap?: Map<string, { label: string; color: string }>
  /** When true, the status filter UI is disabled (e.g. Kanban view shows all statuses). */
  disableStatusFilter?: boolean
}

export function TicketsToolbar({
  searchQuery,
  setSearchQuery,
  projectFilter,
  setProjectFilter,
  projectOptions,
  statusOptions,
  excludedStatuses,
  toggleStatusExcluded,
  assigneeFilter,
  setAssigneeFilter,
  reporterFilter,
  setReporterFilter,
  reporterOptions,
  sqaFilter,
  setSqaFilter,
  sqaOptions,
  priorityFilter,
  setPriorityFilter,
  priorityOptions,
  typeFilter,
  setTypeFilter,
  epicFilter,
  setEpicFilter,
  epicOptions,
  sprintFilter,
  setSprintFilter,
  sprintOptions,
  resetToolbarFilters,
  hasActiveFilters: hasActiveFiltersProp,
  currentUserId,
  statusMap,
  disableStatusFilter = false,
}: TicketsToolbarProps) {
  const defaultExcludedSet = useMemo(
    () => new Set(["cancelled", "completed"]),
    []
  )
  const excludedSet = useMemo(() => new Set(excludedStatuses.map((s) => s.toLowerCase())), [excludedStatuses])
  const statusFilterDiffersFromDefault =
    excludedSet.size !== defaultExcludedSet.size ||
    [...excludedSet].some((s) => !defaultExcludedSet.has(s))

  const hasActiveFilters =
    hasActiveFiltersProp ??
    (searchQuery.trim() !== "" ||
      projectFilter !== "all" ||
      (!disableStatusFilter && statusFilterDiffersFromDefault) ||
      assigneeFilter !== "all" ||
      reporterFilter !== "all" ||
      sqaFilter !== "all" ||
      priorityFilter !== "all" ||
      typeFilter !== "all" ||
      epicFilter !== "all" ||
      sprintFilter !== "all")

  return (
    <FilterBar
      hasActiveFilters={hasActiveFilters}
      onResetFilters={resetToolbarFilters}
      filters={
        <>
          <FilterField label="Search">
            <div className="relative w-80 min-w-[200px]">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="tickets-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="By ID, title, or description"
                className="h-9 pl-8"
              />
            </div>
          </FilterField>

          <FilterField label="Project" id="tickets-filter-project">
            <Select
              id="tickets-filter-project"
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="min-w-[140px]"
            >
              <option value="all">All</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Status" id="tickets-filter-status">
            <StatusFilterDropdown
              id="tickets-filter-status"
              statusOptions={statusOptions}
              excludedStatuses={excludedStatuses}
              toggleStatusExcluded={toggleStatusExcluded}
              statusMap={statusMap}
              disabled={disableStatusFilter}
            />
          </FilterField>

          <FilterField label="Assignee" id="tickets-filter-assignee">
            <Select
              id="tickets-filter-assignee"
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
              className="min-w-[140px]"
            >
              <option value="all">All</option>
              {currentUserId ? <option value={currentUserId}>Assigned to me</option> : null}
              <option value="unassigned">Unassigned</option>
            </Select>
          </FilterField>

          <FilterField label="Reporter" id="tickets-filter-reporter" className="min-w-[180px]">
            <Select
              id="tickets-filter-reporter"
              value={reporterFilter}
              onChange={(event) => setReporterFilter(event.target.value)}
            >
              <option value="all">All</option>
              {reporterOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="SQA" id="tickets-filter-sqa" className="min-w-[160px]">
            <Select
              id="tickets-filter-sqa"
              value={sqaFilter}
              onChange={(event) => setSqaFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="unassigned">Unassigned</option>
              {sqaOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Priority" id="tickets-filter-priority" className="min-w-[160px]">
            <div className="relative flex min-h-9 items-center rounded-md border border-input bg-form-bg px-3">
              {priorityFilter !== "all" ? (
                <PriorityPill priority={priorityFilter} className="pointer-events-none shrink-0" />
              ) : (
                <span className="pointer-events-none text-sm text-muted-foreground">All</span>
              )}
              <Select
                id="tickets-filter-priority"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className={cn("absolute inset-0 cursor-pointer opacity-0")}
              >
                <option value="all">All</option>
                {priorityOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
          </FilterField>

          <FilterField label="Type" id="tickets-filter-type" className="min-w-[160px]">
            <Select
              id="tickets-filter-type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="bug">Bug</option>
              <option value="request">Request</option>
              <option value="task">Task</option>
              <option value="subtask">Subtask</option>
            </Select>
          </FilterField>

          <FilterField label="Epic" id="tickets-filter-epic" className="min-w-[160px]">
            <Select
              id="tickets-filter-epic"
              value={epicFilter}
              onChange={(event) => setEpicFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="no_epic">No epic</option>
              {epicOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Sprint" id="tickets-filter-sprint" className="min-w-[160px]">
            <Select
              id="tickets-filter-sprint"
              value={sprintFilter}
              onChange={(event) => setSprintFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="no_sprint">No sprint</option>
              {sprintOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FilterField>
        </>
      }
    />
  )
}
