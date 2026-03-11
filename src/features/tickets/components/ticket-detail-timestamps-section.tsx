"use client"

import { DateTimePicker } from "@client/components/ui/datetime-picker"
import type { Ticket } from "@shared/types"
import type { TimestampValidation } from "@client/features/tickets/components/ticket-detail-sidebar-types"

const sectionTitleClassName = "mb-2 text-xs font-medium uppercase tracking-wide text-slate-500"
const fieldLabelClassName =
  "w-[6.5rem] flex-shrink-0 pt-2 text-xs font-medium uppercase tracking-wide text-slate-500"

type TicketDetailTimestampsSectionProps = {
  ticket: Ticket
  canEditTickets: boolean
  isAssignmentLocked: boolean
  updatingFields: Record<string, boolean>
  timestampValidation: TimestampValidation
  parseTimestamp: (timestamp: string | null | undefined) => Date | null
  getTimestampWarningMessage: (field: "assigned_at" | "started_at" | "completed_at") => string | null
  onTimestampChange: (
    field: "created_at" | "assigned_at" | "sqa_assigned_at" | "started_at" | "completed_at",
    value: Date | null
  ) => void | Promise<void>
}

export function TicketDetailTimestampsSection({
  ticket,
  canEditTickets,
  isAssignmentLocked,
  updatingFields,
  timestampValidation,
  parseTimestamp,
  getTimestampWarningMessage,
  onTimestampChange,
}: TicketDetailTimestampsSectionProps) {
  return (
    <div>
      <h3 className={sectionTitleClassName}>Timestamps</h3>
      <div className="space-y-2.5">
        <div className="flex items-start gap-3">
          <label className={fieldLabelClassName}>Created</label>
          <div className="min-w-0 flex-1">
            <DateTimePicker
              value={parseTimestamp(ticket.createdAt)}
              onChange={(value) => void onTimestampChange("created_at", value)}
              disabled={!canEditTickets || isAssignmentLocked || updatingFields["createdAt"]}
              placeholder="Not set"
              className="h-8 w-full"
              hideIcon
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex w-[6.5rem] flex-shrink-0 items-center gap-1.5">
            <label className="pt-2 text-xs font-medium uppercase tracking-wide text-slate-500">Assigned</label>
            {!ticket.assignedAt && timestampValidation.assigned_at ? (
              <span title={getTimestampWarningMessage("assigned_at") || ""} className="cursor-help pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-red-700">Warning</span>
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <DateTimePicker
              value={parseTimestamp(ticket.assignedAt)}
              onChange={(value) => void onTimestampChange("assigned_at", value)}
              disabled={
                !canEditTickets ||
                isAssignmentLocked ||
                !ticket.assignee ||
                updatingFields["assignedAt"]
              }
              placeholder="Not set"
              className="h-8 w-full"
              hideIcon
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex w-[6.5rem] flex-shrink-0 items-center gap-1.5">
            <label className="pt-2 text-xs font-medium uppercase tracking-wide text-slate-500">Started</label>
            {!ticket.startedAt && timestampValidation.started_at ? (
              <span title={getTimestampWarningMessage("started_at") || ""} className="cursor-help pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-red-700">Warning</span>
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <DateTimePicker
              value={parseTimestamp(ticket.startedAt)}
              onChange={(value) => void onTimestampChange("started_at", value)}
              disabled={
                !canEditTickets ||
                isAssignmentLocked ||
                ticket.status === "open" ||
                updatingFields["startedAt"]
              }
              placeholder="Not set"
              className="h-8 w-full"
              hideIcon
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <label className={fieldLabelClassName}>SQA Assigned</label>
          <div className="min-w-0 flex-1">
            <DateTimePicker
              value={parseTimestamp(ticket.sqaAssignedAt)}
              onChange={(value) => void onTimestampChange("sqa_assigned_at", value)}
              disabled={!canEditTickets || isAssignmentLocked || updatingFields["sqaAssignedAt"]}
              placeholder="Not set"
              className="h-8 w-full"
              hideIcon
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex w-[6.5rem] flex-shrink-0 items-center gap-1.5">
            <label className="pt-2 text-xs font-medium uppercase tracking-wide text-slate-500">Completed</label>
            {!ticket.completedAt && timestampValidation.completed_at ? (
              <span title={getTimestampWarningMessage("completed_at") || ""} className="cursor-help pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-red-700">Warning</span>
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <DateTimePicker
              value={parseTimestamp(ticket.completedAt)}
              onChange={(value) => void onTimestampChange("completed_at", value)}
              disabled={
                !canEditTickets ||
                isAssignmentLocked ||
                (ticket.status !== "completed" &&
                  ticket.status !== "cancelled" &&
                  ticket.status !== "rejected") ||
                updatingFields["completedAt"]
              }
              placeholder="Not set"
              className="h-8 w-full"
              hideIcon
            />
          </div>
        </div>
      </div>
    </div>
  )
}
