"use client"

import { DateTimePicker } from "@/components/ui/datetime-picker"
import { EpicSelect } from "@/components/epic-select"
import { SprintSelect } from "@/components/sprint-select"
import { Switch } from "@/components/ui/switch"
import { TicketPrioritySelect } from "@/components/ticket-priority-select"
import type { Epic } from "@/hooks/use-epics"
import type { Sprint } from "@/hooks/use-sprints"
import type { Department, Ticket } from "@/lib/types"
import type { TicketProjectOption } from "@/features/tickets/components/ticket-detail-sidebar-types"

const NO_DEPARTMENT_VALUE = "no_department"
const NO_PROJECT_VALUE = "no_project"
const nativeSelectClassName =
  "h-8 w-full rounded-md border border-border/45 bg-background/60 px-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-50"

type TicketDetailPlanningSectionProps = {
  ticket: Ticket
  canEditTickets: boolean
  isAssignmentLocked: boolean
  updatingFields: Record<string, boolean>
  departments: Department[]
  epics: Epic[]
  sprints: Sprint[]
  projectOptions: TicketProjectOption[]
  includeInactiveProjects: boolean
  onIncludeInactiveProjectsChange: (value: boolean) => void
  parseTimestamp: (timestamp: string | null | undefined) => Date | null
  onPriorityChange: (value: string) => void | Promise<void>
  onDueDateChange: (value: Date | null) => void | Promise<void>
  onDepartmentChange: (value: string) => void | Promise<void>
  onEpicChange: (value: string | null) => void | Promise<void>
  onSprintChange: (value: string | null) => void | Promise<void>
  onProjectChange: (value: string) => void | Promise<void>
}

export function TicketDetailPlanningSection({
  ticket,
  canEditTickets,
  isAssignmentLocked,
  updatingFields,
  departments,
  epics,
  sprints,
  projectOptions,
  includeInactiveProjects,
  onIncludeInactiveProjectsChange,
  parseTimestamp,
  onPriorityChange,
  onDueDateChange,
  onDepartmentChange,
  onEpicChange,
  onSprintChange,
  onProjectChange,
}: TicketDetailPlanningSectionProps) {
  const projectId = ticket.project?.id || null

  return (
    <>
      <div className="flex items-start gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Priority</label>
        <div className="flex-1 min-w-0">
          <TicketPrioritySelect
            value={ticket.priority}
            onValueChange={(value) => void onPriorityChange(value)}
            disabled={!canEditTickets || isAssignmentLocked || updatingFields["priority"]}
            triggerClassName="h-8 w-full"
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Due Date</label>
        <div className="flex-1 min-w-0">
          <DateTimePicker
            value={parseTimestamp(ticket.dueDate)}
            onChange={(value) => void onDueDateChange(value)}
            disabled={!canEditTickets || isAssignmentLocked || updatingFields["dueDate"]}
            placeholder="No due date"
            className="w-full h-8"
            hideIcon
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Department</label>
        <div className="flex-1 min-w-0">
          <select
            value={ticket.department?.id || NO_DEPARTMENT_VALUE}
            onChange={(event) => void onDepartmentChange(event.target.value)}
            disabled={!canEditTickets || isAssignmentLocked || updatingFields["departmentId"]}
            className={nativeSelectClassName}
          >
            <option value={NO_DEPARTMENT_VALUE}>No Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Epic</label>
        <div className="flex-1 min-w-0">
          <EpicSelect
            value={ticket.epic?.id || null}
            onValueChange={(value) => void onEpicChange(value)}
            epics={epics}
            disabled={!canEditTickets || isAssignmentLocked || updatingFields["epicId"] || !projectId}
            triggerClassName="h-8 w-full"
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Sprint</label>
        <div className="flex-1 min-w-0">
          <SprintSelect
            value={ticket.sprint?.id || null}
            onValueChange={(value) => void onSprintChange(value)}
            sprints={sprints}
            disabled={!canEditTickets || isAssignmentLocked || updatingFields["sprintId"] || !projectId}
            triggerClassName="h-8 w-full"
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Project</label>
        <div className="flex-1 min-w-0">
          <select
            value={ticket.project?.id || NO_PROJECT_VALUE}
            onChange={(event) => void onProjectChange(event.target.value)}
            disabled={!canEditTickets || isAssignmentLocked || updatingFields["projectId"]}
            className={nativeSelectClassName}
          >
            <option value={NO_PROJECT_VALUE}>No Project</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
          </select>
          <div className="mt-3 flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">Include Inactive</span>
            <Switch
              checked={includeInactiveProjects}
              onCheckedChange={onIncludeInactiveProjectsChange}
              aria-label="Include inactive projects"
            />
          </div>
        </div>
      </div>
    </>
  )
}
