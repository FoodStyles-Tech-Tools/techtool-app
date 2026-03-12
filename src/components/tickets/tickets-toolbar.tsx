"use client"

import { MagnifyingGlassIcon } from "@heroicons/react/20/solid"
import { Input } from "@client/components/ui/input"
import { Select } from "@client/components/ui/select"
import { Checkbox } from "@client/components/ui/checkbox"
import { FilterBar } from "@client/components/ui/filter-bar"
import { FilterField } from "@client/components/ui/filter-field"

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
  statusFilter: string
  setStatusFilter: (value: string) => void
  statusOptions: StatusOption[]
  excludeDone: boolean
  setExcludeDone: (value: boolean) => void
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
  epicFilter: string
  setEpicFilter: (value: string) => void
  epicOptions: EpicSprintOption[]
  sprintFilter: string
  setSprintFilter: (value: string) => void
  sprintOptions: EpicSprintOption[]
  resetToolbarFilters: () => void
  currentUserId: string | null
}

export function TicketsToolbar({
  searchQuery,
  setSearchQuery,
  projectFilter,
  setProjectFilter,
  projectOptions,
  statusFilter,
  setStatusFilter,
  statusOptions,
  excludeDone,
  setExcludeDone,
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
  epicFilter,
  setEpicFilter,
  epicOptions,
  sprintFilter,
  setSprintFilter,
  sprintOptions,
  resetToolbarFilters,
  currentUserId,
}: TicketsToolbarProps) {
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    projectFilter !== "all" ||
    statusFilter !== "all" ||
    assigneeFilter !== "all" ||
    reporterFilter !== "all" ||
    sqaFilter !== "all" ||
    priorityFilter !== "all" ||
    epicFilter !== "all" ||
    sprintFilter !== "all" ||
    excludeDone

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
              className="min-w-[120px]"
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
            <Select
              id="tickets-filter-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-w-[120px]"
            >
              <option value="all">All</option>
              {statusOptions.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Assignee" id="tickets-filter-assignee">
            <Select
              id="tickets-filter-assignee"
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
              className="min-w-[120px]"
            >
              <option value="all">All</option>
              {currentUserId ? <option value={currentUserId}>Assigned to me</option> : null}
              <option value="unassigned">Unassigned</option>
            </Select>
          </FilterField>

          <FilterField label="Reporter" id="tickets-filter-reporter">
            <Select
              id="tickets-filter-reporter"
              value={reporterFilter}
              onChange={(event) => setReporterFilter(event.target.value)}
              className="min-w-[140px]"
            >
              <option value="all">All</option>
              {reporterOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="SQA" id="tickets-filter-sqa">
            <Select
              id="tickets-filter-sqa"
              value={sqaFilter}
              onChange={(event) => setSqaFilter(event.target.value)}
              className="min-w-[120px]"
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

          <FilterField label="Priority" id="tickets-filter-priority">
            <Select
              id="tickets-filter-priority"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="min-w-[120px]"
            >
              <option value="all">All</option>
              {priorityOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Epic" id="tickets-filter-epic">
            <Select
              id="tickets-filter-epic"
              value={epicFilter}
              onChange={(event) => setEpicFilter(event.target.value)}
              className="min-w-[120px]"
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

          <FilterField label="Sprint" id="tickets-filter-sprint">
            <Select
              id="tickets-filter-sprint"
              value={sprintFilter}
              onChange={(event) => setSprintFilter(event.target.value)}
              className="min-w-[120px]"
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

          <FilterField label="Hide done">
            <Checkbox
              id="tickets-filter-exclude-done"
              checked={excludeDone}
              onChange={(event) => setExcludeDone(event.target.checked)}
              label=""
            />
          </FilterField>
        </>
      }
    />
  )
}
