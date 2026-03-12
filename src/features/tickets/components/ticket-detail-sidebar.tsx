"use client"

import { Card } from "@client/components/ui/card"
import { TicketStatusSelect } from "@client/components/ticket-status-select"
import { TicketDetailFieldsSection } from "@client/features/tickets/components/ticket-detail-fields-section"
import { TicketDetailTimestampsSection } from "@client/features/tickets/components/ticket-detail-timestamps-section"
import type {
  ParentTicketOption,
  TicketProjectOption,
  TimestampValidation,
} from "@client/features/tickets/components/ticket-detail-sidebar-types"
import type { Epic } from "@client/hooks/use-epics"
import type { Sprint } from "@client/hooks/use-sprints"
import type { Department, Ticket, User } from "@shared/types"

type TicketDetailSidebarProps = {
  hideStatusRow?: boolean
  isArchivedTicket?: boolean
  ticket: Ticket
  canEditTickets: boolean
  isAssignmentLocked: boolean
  isSqaEditLocked: boolean
  updatingFields: Record<string, boolean>
  currentUser: User | null
  users: User[]
  assigneeEligibleUsers: User[]
  sqaEligibleUsers: User[]
  departments: Department[]
  epics: Epic[]
  sprints: Sprint[]
  projectOptions: TicketProjectOption[]
  parentTicketOptions: ParentTicketOption[]
  selectedParentTicketId: string | null
  selectedParentTicketOption: ParentTicketOption | null
  parentNavigationSlug: string | null
  timestampValidation: TimestampValidation
  parseTimestamp: (timestamp: string | null | undefined) => Date | null
  getTimestampWarningMessage: (field: "assigned_at" | "started_at" | "completed_at") => string | null
  onAssigneeChange: (value: string | null) => void | Promise<void>
  onRequestedByChange: (value: string) => void | Promise<void>
  onSqaAssigneeChange: (value: string | null) => void | Promise<void>
  onTypeChange: (value: string) => void | Promise<void>
  onParentTicketChange: (value: string) => void | Promise<void>
  onPriorityChange: (value: string) => void | Promise<void>
  onDueDateChange: (value: Date | null) => void | Promise<void>
  onDepartmentChange: (value: string) => void | Promise<void>
  onEpicChange: (value: string | null) => void | Promise<void>
  onSprintChange: (value: string | null) => void | Promise<void>
  onProjectChange: (value: string) => void | Promise<void>
  onTimestampChange: (
    field: "created_at" | "assigned_at" | "sqa_assigned_at" | "started_at" | "completed_at",
    value: Date | null
  ) => void | Promise<void>
  onStatusChange: (value: string) => void | Promise<void>
}

export function TicketDetailSidebar({
  hideStatusRow,
  isArchivedTicket = false,
  ticket,
  canEditTickets,
  isAssignmentLocked,
  isSqaEditLocked,
  updatingFields,
  currentUser,
  users,
  assigneeEligibleUsers,
  sqaEligibleUsers,
  departments,
  epics,
  sprints,
  projectOptions,
  parentTicketOptions,
  selectedParentTicketId,
  selectedParentTicketOption,
  parentNavigationSlug,
  timestampValidation,
  parseTimestamp,
  getTimestampWarningMessage,
  onAssigneeChange,
  onRequestedByChange,
  onSqaAssigneeChange,
  onTypeChange,
  onParentTicketChange,
  onPriorityChange,
  onDueDateChange,
  onDepartmentChange,
  onEpicChange,
  onSprintChange,
  onProjectChange,
  onTimestampChange,
  onStatusChange,
}: TicketDetailSidebarProps) {
  return (
    <aside className="min-w-0 space-y-4">
      {!hideStatusRow ? (
        <div className="flex justify-start">
          {isArchivedTicket ? (
            <span className="flex h-8 items-center text-sm font-medium text-slate-600">Archived</span>
          ) : (
            <TicketStatusSelect
              value={ticket.status}
              onValueChange={onStatusChange}
              disabled={!canEditTickets || isAssignmentLocked || !!updatingFields.status}
              allowSqaStatuses={ticket.project?.require_sqa === true}
              triggerClassName="h-8"
            />
          )}
        </div>
      ) : null}
      <Card className="p-5 shadow-none">
        <h2 className="text-sm font-semibold text-slate-900">Details</h2>
        <div className="mt-3 space-y-4">
          <TicketDetailFieldsSection
            ticket={ticket}
            canEditTickets={canEditTickets}
            isAssignmentLocked={isAssignmentLocked}
            isSqaEditLocked={isSqaEditLocked}
            updatingFields={updatingFields}
            currentUser={currentUser}
            users={users}
            assigneeEligibleUsers={assigneeEligibleUsers}
            sqaEligibleUsers={sqaEligibleUsers}
            departments={departments}
            epics={epics}
            sprints={sprints}
            projectOptions={projectOptions}
            parentTicketOptions={parentTicketOptions}
            selectedParentTicketId={selectedParentTicketId}
            selectedParentTicketOption={selectedParentTicketOption}
            parentNavigationSlug={parentNavigationSlug}
            parseTimestamp={parseTimestamp}
            onAssigneeChange={onAssigneeChange}
            onRequestedByChange={onRequestedByChange}
            onSqaAssigneeChange={onSqaAssigneeChange}
            onTypeChange={onTypeChange}
            onParentTicketChange={onParentTicketChange}
            onPriorityChange={onPriorityChange}
            onDueDateChange={onDueDateChange}
            onDepartmentChange={onDepartmentChange}
            onEpicChange={onEpicChange}
            onSprintChange={onSprintChange}
            onProjectChange={onProjectChange}
          />
          <TicketDetailTimestampsSection
            ticket={ticket}
            canEditTickets={canEditTickets}
            isAssignmentLocked={isAssignmentLocked}
            updatingFields={updatingFields}
            timestampValidation={timestampValidation}
            parseTimestamp={parseTimestamp}
            getTimestampWarningMessage={getTimestampWarningMessage}
            onTimestampChange={onTimestampChange}
          />
        </div>
      </Card>
    </aside>
  )
}
