"use client"

import { MagnifyingGlassIcon, ArrowPathIcon } from "@heroicons/react/20/solid"
import { Button } from "@client/components/ui/button"
import { Input } from "@client/components/ui/input"
import { Select } from "@client/components/ui/select"
import { Checkbox } from "@client/components/ui/checkbox"
import { FilterBar } from "@client/components/ui/filter-bar"

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
  return (
    <FilterBar
      filters={
        <>
          <div className="relative w-80">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tickets by ID, title, or description"
              className="h-9 pl-8"
            />
          </div>

          <Select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            aria-label="Project filter"
          >
            <option value="all">All projects</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Status filter"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </Select>

          <Select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            aria-label="Assignee filter"
          >
            <option value="all">All assignees</option>
            {currentUserId ? <option value={currentUserId}>Assigned to me</option> : null}
            <option value="unassigned">Unassigned</option>
          </Select>

          <Select
            value={reporterFilter}
            onChange={(event) => setReporterFilter(event.target.value)}
            aria-label="Reporter filter"
          >
            <option value="all">All reporters</option>
            {reporterOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email}
              </option>
            ))}
          </Select>

          <Select
            value={sqaFilter}
            onChange={(event) => setSqaFilter(event.target.value)}
            aria-label="SQA filter"
          >
            <option value="all">All SQA</option>
            <option value="unassigned">Unassigned</option>
            {sqaOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email}
              </option>
            ))}
          </Select>

          <Select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            aria-label="Priority filter"
          >
            <option value="all">All priorities</option>
            {priorityOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>

          <Select
            value={epicFilter}
            onChange={(event) => setEpicFilter(event.target.value)}
            aria-label="Epic filter"
          >
            <option value="all">All epics</option>
            <option value="no_epic">No epic</option>
            {epicOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>

          <Select
            value={sprintFilter}
            onChange={(event) => setSprintFilter(event.target.value)}
            aria-label="Sprint filter"
          >
            <option value="all">All sprints</option>
            <option value="no_sprint">No sprint</option>
            {sprintOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <Checkbox
            checked={excludeDone}
            onChange={(event) => setExcludeDone(event.target.checked)}
            label="Hide done"
          />
        </>
      }
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={resetToolbarFilters}
        >
          <ArrowPathIcon className="h-4 w-4" />
          Reset
        </Button>
      }
    />
  )
}
