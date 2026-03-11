"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card"
import { TicketDetailFieldsSection } from "@client/features/tickets/components/ticket-detail-fields-section"
import { TicketDetailRelationsSection } from "@client/features/tickets/components/ticket-detail-relations-section"
import { TicketDetailTimestampsSection } from "@client/features/tickets/components/ticket-detail-timestamps-section"
import type {
  ParentTicketOption,
  TicketProjectOption,
  TimestampValidation,
} from "@client/features/tickets/components/ticket-detail-sidebar-types"
import type { Epic } from "@client/hooks/use-epics"
import type { Sprint } from "@client/hooks/use-sprints"
import type {
  Department,
  Ticket,
  TicketDetailRelations,
  User,
} from "@shared/types"

type TicketDetailSidebarProps = {
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
  relations: TicketDetailRelations
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
}

export function TicketDetailSidebar({
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
  relations,
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
}: TicketDetailSidebarProps) {
  return (
    <div className="min-w-0">
      <Card>
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="space-y-4">
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
            <details className="rounded-md border border-slate-200">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                <span>Advanced details</span>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Open</span>
              </summary>
              <div className="space-y-4 border-t border-slate-200 p-3">
                <TicketDetailRelationsSection ticket={ticket} relations={relations} />
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
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
