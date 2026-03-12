"use client"

import { useMemo } from "react"
import { cn } from "@client/lib/utils"
import { TicketTypeSelect, TicketTypePill } from "@client/components/ticket-type-select"
import type { Ticket, User } from "@shared/types"
import { selectStyleInputSm } from "@client/lib/form-styles"

const UNASSIGNED_VALUE = "unassigned"
const nativeSelectClassName = selectStyleInputSm
const fieldLabelClassName =
  "w-[6.5rem] flex-shrink-0 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"

type TicketDetailAssignmentSectionProps = {
  ticket: Ticket
  canEditTickets: boolean
  isAssignmentLocked: boolean
  isSqaEditLocked: boolean
  updatingFields: Record<string, boolean>
  currentUser: User | null
  users: User[]
  assigneeEligibleUsers: User[]
  sqaEligibleUsers: User[]
  onAssigneeChange: (value: string | null) => void | Promise<void>
  onRequestedByChange: (value: string) => void | Promise<void>
  onSqaAssigneeChange: (value: string | null) => void | Promise<void>
  onTypeChange: (value: string) => void | Promise<void>
}

export function TicketDetailAssignmentSection({
  ticket,
  canEditTickets,
  isAssignmentLocked,
  isSqaEditLocked,
  updatingFields,
  currentUser,
  users,
  assigneeEligibleUsers,
  sqaEligibleUsers,
  onAssigneeChange,
  onRequestedByChange,
  onSqaAssigneeChange,
  onTypeChange,
}: TicketDetailAssignmentSectionProps) {
  const sortedAssigneeEligibleUsers = useMemo(
    () =>
      [...assigneeEligibleUsers].sort((a, b) => {
        const aLabel = (a.name || a.email || "").toLowerCase()
        const bLabel = (b.name || b.email || "").toLowerCase()
        return aLabel.localeCompare(bLabel)
      }),
    [assigneeEligibleUsers]
  )
  const sortedReporterUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const aLabel = (a.name || a.email || "").toLowerCase()
        const bLabel = (b.name || b.email || "").toLowerCase()
        return aLabel.localeCompare(bLabel)
      }),
    [users]
  )
  const sortedSqaEligibleUsers = useMemo(
    () =>
      [...sqaEligibleUsers].sort((a, b) => {
        const aLabel = (a.name || a.email || "").toLowerCase()
        const bLabel = (b.name || b.email || "").toLowerCase()
        return aLabel.localeCompare(bLabel)
      }),
    [sqaEligibleUsers]
  )

  return (
    <>
      <div className="flex items-start gap-3">
        <label className={fieldLabelClassName}>Assignee</label>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <select
                value={ticket.assignee?.id || UNASSIGNED_VALUE}
                onChange={(event) =>
                  void onAssigneeChange(
                    event.target.value === UNASSIGNED_VALUE ? null : event.target.value
                  )
                }
                disabled={!canEditTickets || updatingFields["assigneeId"]}
                className={nativeSelectClassName}
              >
                <option value={UNASSIGNED_VALUE}>Unassigned</option>
                {sortedAssigneeEligibleUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>
            {!ticket.assignee && currentUser ? (
              <button
                type="button"
                className="whitespace-nowrap text-xs text-primary underline disabled:opacity-50"
                onClick={() => void onAssigneeChange(currentUser.id)}
                disabled={updatingFields["assigneeId"] || !canEditTickets}
              >
                Assign to me
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className={fieldLabelClassName}>Reporter</label>
        <div className="min-w-0 flex-1">
          <select
            value={ticket.requestedBy?.id || ""}
            onChange={(event) => void onRequestedByChange(event.target.value)}
            disabled={!canEditTickets || isAssignmentLocked || updatingFields["requestedById"]}
            className={nativeSelectClassName}
          >
            <option value="">Select user</option>
            {sortedReporterUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className={fieldLabelClassName}>SQA</label>
        <div className="min-w-0 flex-1">
          <select
            value={ticket.sqaAssignee?.id || UNASSIGNED_VALUE}
            onChange={(event) =>
              void onSqaAssigneeChange(
                event.target.value === UNASSIGNED_VALUE ? null : event.target.value
              )
            }
            disabled={
              !canEditTickets ||
              updatingFields["sqaAssigneeId"] ||
              (isAssignmentLocked && !isSqaEditLocked)
            }
            className={nativeSelectClassName}
          >
            <option value={UNASSIGNED_VALUE}>Unassigned</option>
            {sortedSqaEligibleUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className={fieldLabelClassName}>Type</label>
        <div className="min-w-0 flex-1">
          {ticket.type === "subtask" ? (
            <div className="inline-flex items-center">
              <TicketTypePill
                type="Subtask"
                className="border-emerald-500/60 bg-emerald-500/10 text-emerald-500"
              />
            </div>
          ) : (
            <TicketTypeSelect
              value={ticket.type || "task"}
              onValueChange={(value) => void onTypeChange(value)}
              disabled={!canEditTickets || isAssignmentLocked || updatingFields["type"]}
              isLoading={!!updatingFields["type"]}
              triggerClassName="h-8 w-full"
            />
          )}
        </div>
      </div>
    </>
  )
}
