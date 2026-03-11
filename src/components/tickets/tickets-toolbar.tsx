"use client"

import { Button } from "@client/components/ui/button"
import { Input } from "@client/components/ui/input"

interface ProjectOption {
  id: string
  name: string
}

interface StatusOption {
  id: string
  label: string
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
  resetToolbarFilters,
  currentUserId,
}: TicketsToolbarProps) {
  const selectClassName =
    "h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-center gap-2 whitespace-nowrap py-1">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search tickets by ID, title, or description"
          className="h-9 w-80"
        />

        <select
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className={selectClassName}
          aria-label="Project filter"
        >
          <option value="all">All projects</option>
          {projectOptions.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className={selectClassName}
          aria-label="Status filter"
        >
          <option value="all">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>

        <select
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
          className={selectClassName}
          aria-label="Assignee filter"
        >
          <option value="all">All assignees</option>
          {currentUserId ? <option value={currentUserId}>Assigned to me</option> : null}
          <option value="unassigned">Unassigned</option>
        </select>

        <label className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={excludeDone}
            onChange={(event) => setExcludeDone(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Hide done
        </label>

        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3"
          onClick={resetToolbarFilters}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}
