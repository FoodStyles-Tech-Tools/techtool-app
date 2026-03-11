"use client"

import { DateTimePicker } from "@client/components/ui/datetime-picker"
import { EpicSelect } from "@client/components/epic-select"
import { SprintSelect } from "@client/components/sprint-select"
import { TicketPrioritySelect } from "@client/components/ticket-priority-select"
import type { Epic } from "@client/hooks/use-epics"
import type { Sprint } from "@client/hooks/use-sprints"
import type { Department, Ticket } from "@shared/types"
import type { TicketProjectOption } from "@client/features/tickets/components/ticket-detail-sidebar-types"

const NO_DEPARTMENT_VALUE = "no_department"
const NO_PROJECT_VALUE = "no_project"
const nativeSelectClassName =
  "h-8 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
const fieldLabelClassName =
  "w-[6.5rem] flex-shrink-0 pt-2 text-xs font-medium uppercase tracking-wide text-slate-500"

type TicketDetailPlanningSectionProps = {
  ticket: Ticket
  canEditTickets: boolean
  isAssignmentLocked: boolean
  updatingFields: Record<string, boolean>
  departments: Department[]
  epics: Epic[]
  sprints: Sprint[]
  projectOptions: TicketProjectOption[]
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
        <label className={fieldLabelClassName}>Priority</label>
        <div className="min-w-0 flex-1">
          <TicketPrioritySelect
            value={ticket.priority}
            onValueChange={(value) => void onPriorityChange(value)}
            disabled={!canEditTickets || isAssignmentLocked || updatingFields["priority"]}
            triggerClassName="h-8 w-full"
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className={fieldLabelClassName}>Due Date</label>
        <div className="min-w-0 flex-1">
          <DateTimePicker
            value={parseTimestamp(ticket.dueDate)}
            onChange={(value) => void onDueDateChange(value)}
            disabled={!canEditTickets || isAssignmentLocked || updatingFields["dueDate"]}
            placeholder="No due date"
            className="h-8 w-full"
            hideIcon
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className={fieldLabelClassName}>Department</label>
        <div className="min-w-0 flex-1">
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
        <label className={fieldLabelClassName}>Epic</label>
        <div className="min-w-0 flex-1">
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
        <label className={fieldLabelClassName}>Sprint</label>
        <div className="min-w-0 flex-1">
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
        <label className={fieldLabelClassName}>Project</label>
        <div className="min-w-0 flex-1">
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
        </div>
      </div>
    </>
  )
}
