"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Circle, ChevronDown, Table2, LayoutGrid, Share2, Plus, BarChart3 } from "lucide-react"

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

  return (
    <div className="space-y-2 border-b pb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 text-sm">
                <Circle className="h-2.5 w-2.5 fill-blue-500 text-blue-500" />
                <span className="max-w-[220px] truncate">{selectedProjectLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Project</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="justify-between gap-2"
                onSelect={(e) => e.preventDefault()}
              >
                <span>Include Inactive</span>
                <Switch
                  checked={includeInactiveProjects}
                  onCheckedChange={setIncludeInactiveProjects}
                  aria-label="Include inactive projects"
                />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={projectFilter} onValueChange={setProjectFilter}>
                <DropdownMenuRadioItem value="all">All Projects</DropdownMenuRadioItem>
                {projectOptions.map((project) => (
                  <DropdownMenuRadioItem key={project.id} value={project.id}>
                    {project.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 px-2"
              >
                {showLabel}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Show</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAssigneeFilter("all")}>
                All Tickets
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setAssigneeFilter(currentUserId || "all")}
                disabled={!currentUserId}
              >
                My Tickets
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAssigneeFilter("unassigned")}>
                Unassigned
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {sprintOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2"
                >
                  {sprintLabel}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Sprint</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sprintFilter} onValueChange={setSprintFilter}>
                  <DropdownMenuRadioItem value="all">All Sprints</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="no_sprint">No Sprint</DropdownMenuRadioItem>
                  {sprintOptions.map((sprint) => (
                    <DropdownMenuRadioItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={resetToolbarFilters}
          >
            Reset
          </Button>
          {(canCreateTickets || canEditProjects) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="ml-1 inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Create</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {canCreateTickets && (
                  <DropdownMenuItem onClick={onOpenCreateTicket}>
                    Ticket
                  </DropdownMenuItem>
                )}
                {canEditProjects && (
                  <DropdownMenuItem onClick={onOpenCreateEpic}>
                    Epic
                  </DropdownMenuItem>
                )}
                {canEditProjects && (
                  <DropdownMenuItem onClick={onOpenCreateSprint}>
                    Sprint
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
