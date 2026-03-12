"use client"

import { TicketDetailAssignmentSection } from "@client/features/tickets/components/ticket-detail-assignment-section"
import { TicketDetailPlanningSection } from "@client/features/tickets/components/ticket-detail-planning-section"
import type { Epic } from "@client/hooks/use-epics"
import type { Sprint } from "@client/hooks/use-sprints"
import type { Department, Ticket, User } from "@shared/types"
import type { TicketProjectOption } from "@client/features/tickets/components/ticket-detail-sidebar-types"

type TicketDetailFieldsSectionProps = {
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
  parseTimestamp: (timestamp: string | null | undefined) => Date | null
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
}

export function TicketDetailFieldsSection(props: TicketDetailFieldsSectionProps) {
  return (
    <>
      <TicketDetailAssignmentSection
        ticket={props.ticket}
        canEditTickets={props.canEditTickets}
        isAssignmentLocked={props.isAssignmentLocked}
        isSqaEditLocked={props.isSqaEditLocked}
        updatingFields={props.updatingFields}
        currentUser={props.currentUser}
        users={props.users}
        assigneeEligibleUsers={props.assigneeEligibleUsers}
        sqaEligibleUsers={props.sqaEligibleUsers}
        onAssigneeChange={props.onAssigneeChange}
        onRequestedByChange={props.onRequestedByChange}
        onSqaAssigneeChange={props.onSqaAssigneeChange}
        onTypeChange={props.onTypeChange}
      />
      <TicketDetailPlanningSection
        ticket={props.ticket}
        canEditTickets={props.canEditTickets}
        isAssignmentLocked={props.isAssignmentLocked}
        updatingFields={props.updatingFields}
        departments={props.departments}
        epics={props.epics}
        sprints={props.sprints}
        projectOptions={props.projectOptions}
        parseTimestamp={props.parseTimestamp}
        onPriorityChange={props.onPriorityChange}
        onDueDateChange={props.onDueDateChange}
        onDepartmentChange={props.onDepartmentChange}
        onEpicChange={props.onEpicChange}
        onSprintChange={props.onSprintChange}
        onProjectChange={props.onProjectChange}
      />
    </>
  )
}
