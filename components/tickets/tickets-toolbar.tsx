"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Circle, ChevronDown, Table2, LayoutGrid, Share2, ListFilter, Plus } from "lucide-react"

interface ProjectOption {
  id: string
  name: string
}

export interface TicketsToolbarProps {
  selectedProjectLabel: string
  projectFilter: string
  setProjectFilter: (value: string) => void
  projectOptions: ProjectOption[]
  includeInactiveProjects: boolean
  setIncludeInactiveProjects: (value: boolean) => void
  view: "table" | "kanban"
  setView: (view: "table" | "kanban") => void
  onShareView: () => void
  activeFilterCount: number
  excludeDone: boolean
  setExcludeDone: (value: boolean) => void
  assigneeFilter: string
  setAssigneeFilter: (value: string) => void
  resetToolbarFilters: () => void
  canCreateTickets: boolean
  onOpenCreateTicket: () => void
  currentUserId: string | null
}

export function TicketsToolbar({
  selectedProjectLabel,
  projectFilter,
  setProjectFilter,
  projectOptions,
  includeInactiveProjects,
  setIncludeInactiveProjects,
  view,
  setView,
  onShareView,
  activeFilterCount,
  excludeDone,
  setExcludeDone,
  assigneeFilter,
  setAssigneeFilter,
  resetToolbarFilters,
  canCreateTickets,
  onOpenCreateTicket,
  currentUserId,
}: TicketsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
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
            variant={view === "table" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => view !== "table" && setView("table")}
            className="h-7 w-7"
          >
            <Table2 className="h-4 w-4" />
            <span className="sr-only">Table view</span>
          </Button>
          <Button
            variant={view === "kanban" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => view !== "kanban" && setView("kanban")}
            className="h-7 w-7"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="sr-only">Kanban view</span>
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
      <div className="flex flex-wrap items-center gap-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            >
              <ListFilter className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-between gap-2"
              onSelect={(e) => e.preventDefault()}
            >
              <span>Exclude Done</span>
              <Switch
                checked={excludeDone}
                onCheckedChange={setExcludeDone}
                aria-label="Exclude Done"
              />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Show</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
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
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetToolbarFilters}>Reset Filters</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {canCreateTickets && (
          <button
            type="button"
            onClick={onOpenCreateTicket}
            className="ml-1 inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            <span>Create Ticket</span>
            <span className="hidden items-center gap-1 sm:inline-flex">
              <kbd className="rounded border border-border/60 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
                Alt
              </kbd>
              <span className="text-[10px] text-muted-foreground">/</span>
              <kbd className="rounded border border-border/60 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
                Cmd
              </kbd>
              <span className="text-[10px] text-muted-foreground">+</span>
              <kbd className="rounded border border-border/60 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
                A
              </kbd>
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
