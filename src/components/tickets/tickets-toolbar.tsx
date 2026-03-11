"use client"

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
  return (
    <FilterBar
      filters={
        <>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search tickets by ID, title, or description"
            className="h-9 w-80"
          />

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
          Reset
        </Button>
      }
    />
  )
}
