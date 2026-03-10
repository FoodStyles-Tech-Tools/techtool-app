"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table2, LayoutGrid, Share2, Plus, BarChart3 } from "lucide-react"

interface ProjectOption {
  id: string
  name: string
}

interface SprintOption {
  id: string
  name: string
}

export interface TicketsToolbarProps {
  searchQuery: string
  setSearchQuery: (value: string) => void
  selectedProjectLabel: string
  projectFilter: string
  setProjectFilter: (value: string) => void
  projectOptions: ProjectOption[]
  sprintFilter: string
  setSprintFilter: (value: string) => void
  sprintOptions: SprintOption[]
  includeInactiveProjects: boolean
  setIncludeInactiveProjects: (value: boolean) => void
  view: "table" | "kanban" | "gantt"
  setView: (view: "table" | "kanban" | "gantt") => void
  onShareView: () => void
  excludeDone: boolean
  setExcludeDone: (value: boolean) => void
  assigneeFilter: string
  setAssigneeFilter: (value: string) => void
  resetToolbarFilters: () => void
  canCreateTickets: boolean
  onOpenCreateTicket: () => void
  canEditProjects: boolean
  onOpenCreateEpic: () => void
  onOpenCreateSprint: () => void
  currentUserId: string | null
}

export function TicketsToolbar({
  searchQuery,
  setSearchQuery,
  selectedProjectLabel,
  projectFilter,
  setProjectFilter,
  projectOptions,
  sprintFilter,
  setSprintFilter,
  sprintOptions,
  includeInactiveProjects,
  setIncludeInactiveProjects,
  view,
  setView,
  onShareView,
  excludeDone,
  setExcludeDone,
  assigneeFilter,
  setAssigneeFilter,
  resetToolbarFilters,
  canCreateTickets,
  onOpenCreateTicket,
  canEditProjects,
  onOpenCreateEpic,
  onOpenCreateSprint,
  currentUserId,
}: TicketsToolbarProps) {
  const selectClassName =
    "h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"

  return (
    <div className="space-y-3 border-b pb-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <span>Exclude done</span>
            <Switch
              checked={excludeDone}
              onCheckedChange={setExcludeDone}
              aria-label="Exclude done"
            />
          </label>
          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            className={selectClassName}
            aria-label="Assignee filter"
          >
            <option value="all">All tickets</option>
            {currentUserId ? <option value={currentUserId}>My tickets</option> : null}
            <option value="unassigned">Unassigned</option>
          </select>
          {sprintOptions.length > 0 && (
            <select
              value={sprintFilter}
              onChange={(event) => setSprintFilter(event.target.value)}
              className={selectClassName}
              aria-label="Sprint filter"
            >
              <option value="all">All sprints</option>
              <option value="no_sprint">No sprint</option>
              {sprintOptions.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3"
            onClick={resetToolbarFilters}
          >
            Reset
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white p-0.5">
            <Button
              variant={view === "table" ? "primary" : "ghost"}
              size="icon"
              onClick={() => setView("table")}
              className="h-8 w-8"
            >
              <Table2 className="h-4 w-4" />
              <span className="sr-only">Table view</span>
            </Button>
            <Button
              variant={view === "kanban" ? "primary" : "ghost"}
              size="icon"
              onClick={() => setView("kanban")}
              className="h-8 w-8"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">Kanban view</span>
            </Button>
            <Button
              variant={view === "gantt" ? "primary" : "ghost"}
              size="icon"
              onClick={() => setView("gantt")}
              className="h-8 w-8"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="sr-only">Gantt view</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-slate-600"
            onClick={onShareView}
          >
            <Share2 className="mr-1 h-4 w-4" />
            Share
          </Button>
          {canCreateTickets && (
            <Button type="button" size="sm" className="h-9 px-3" onClick={onOpenCreateTicket}>
              <Plus className="mr-1 h-4 w-4" />
              Ticket
            </Button>
          )}
          {canEditProjects && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3"
                onClick={onOpenCreateEpic}
              >
                <Plus className="mr-1 h-4 w-4" />
                Epic
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3"
                onClick={onOpenCreateSprint}
              >
                <Plus className="mr-1 h-4 w-4" />
                Sprint
              </Button>
            </>
          )}
        </div>
      </div>
      <Input
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search tickets, IDs, descriptions..."
        className="h-9 w-full max-w-md"
      />
    </div>
  )
}
