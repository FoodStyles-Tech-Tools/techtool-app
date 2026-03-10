"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Circle, Table2, LayoutGrid, Share2, Plus, BarChart3 } from "lucide-react"

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
  const showLabel =
    assigneeFilter === "all"
      ? "All tickets"
      : assigneeFilter === "unassigned"
      ? "Unassigned"
      : assigneeFilter === currentUserId
      ? "My tickets"
      : "Custom"

  const sprintLabel =
    sprintFilter === "all"
      ? "All sprints"
      : sprintFilter === "no_sprint"
      ? "No sprint"
      : sprintOptions.find((s) => s.id === sprintFilter)?.name || "Sprint"

  const nativeSelectClassName =
    "h-8 rounded-md border border-border/60 bg-background px-2 text-sm text-foreground outline-none transition-colors focus:border-foreground/20"

  return (
    <div className="space-y-2 border-b pb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1">
            <Circle className="h-2.5 w-2.5 fill-blue-500 text-blue-500" />
            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className={nativeSelectClassName}
              aria-label="Project filter"
            >
              <option value="all">All Projects</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={includeInactiveProjects}
                onChange={(event) => setIncludeInactiveProjects(event.target.checked)}
                className="h-4 w-4 rounded border-border text-foreground"
              />
              Include inactive
            </label>
          </div>
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              variant={view === "table" ? "selected" : "ghost"}
              size="icon"
              onClick={() => view !== "table" && setView("table")}
              className="h-7 w-7"
            >
              <Table2 className="h-4 w-4" />
              <span className="sr-only">Table view</span>
            </Button>
            <Button
              variant={view === "kanban" ? "selected" : "ghost"}
              size="icon"
              onClick={() => view !== "kanban" && setView("kanban")}
              className="h-7 w-7"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">Kanban view</span>
            </Button>
            <Button
              variant={view === "gantt" ? "selected" : "ghost"}
              size="icon"
              onClick={() => view !== "gantt" && setView("gantt")}
              className="h-7 w-7"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="sr-only">Gantt view</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            onClick={onShareView}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex items-center gap-2 rounded-md border px-2 py-1.5">
            <span className="text-xs text-muted-foreground">Exclude Done</span>
            <Switch
              checked={excludeDone}
              onCheckedChange={setExcludeDone}
              aria-label="Exclude Done"
            />
          </div>
          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            className={nativeSelectClassName}
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
              className={nativeSelectClassName}
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
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={resetToolbarFilters}
          >
            Reset
          </Button>
          {canCreateTickets && (
            <button
              type="button"
              onClick={onOpenCreateTicket}
              className="ml-1 inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Ticket</span>
            </button>
          )}
          {canEditProjects && (
            <>
              <button
                type="button"
                onClick={onOpenCreateEpic}
                className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                <span>Epic</span>
              </button>
              <button
                type="button"
                onClick={onOpenCreateSprint}
                className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                <span>Sprint</span>
              </button>
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
