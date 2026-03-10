"use client"

import { AlertTriangle } from "lucide-react"
import { DateTimePicker } from "@/components/ui/datetime-picker"
import type { Ticket } from "@/lib/types"
import type { TimestampValidation } from "@/features/tickets/components/ticket-detail-sidebar-types"

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
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Timestamps</h3>
      <div className="space-y-2.5">
        <div className="flex items-start gap-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Created</label>
          <div className="flex-1 min-w-0">
            <DateTimePicker
              value={parseTimestamp(ticket.created_at)}
              onChange={(value) => void onTimestampChange("created_at", value)}
              disabled={!canEditTickets || isAssignmentLocked || updatingFields["created_at"]}
              placeholder="Not set"
              className="w-full h-8"
              hideIcon
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 flex-shrink-0 w-[6.5rem]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Assigned</label>
            {!(ticket as { assigned_at?: string | null }).assigned_at && timestampValidation.assigned_at ? (
              <span title={getTimestampWarningMessage("assigned_at") || ""} className="cursor-help pt-2">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              </span>
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            <DateTimePicker
              value={parseTimestamp((ticket as { assigned_at?: string | null }).assigned_at)}
              onChange={(value) => void onTimestampChange("assigned_at", value)}
              disabled={!canEditTickets || isAssignmentLocked || !ticket.assignee || updatingFields["assigned_at"]}
              placeholder="Not set"
              className="w-full h-8"
              hideIcon
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 flex-shrink-0 w-[6.5rem]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Started</label>
            {!(ticket as { started_at?: string | null }).started_at && timestampValidation.started_at ? (
              <span title={getTimestampWarningMessage("started_at") || ""} className="cursor-help pt-2">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              </span>
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            <DateTimePicker
              value={parseTimestamp((ticket as { started_at?: string | null }).started_at)}
              onChange={(value) => void onTimestampChange("started_at", value)}
              disabled={!canEditTickets || isAssignmentLocked || ticket.status === "open" || updatingFields["started_at"]}
              placeholder="Not set"
              className="w-full h-8"
              hideIcon
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">
            SQA Assigned
          </label>
          <div className="flex-1 min-w-0">
            <DateTimePicker
              value={parseTimestamp((ticket as { sqa_assigned_at?: string | null }).sqa_assigned_at)}
              onChange={(value) => void onTimestampChange("sqa_assigned_at", value)}
              disabled={!canEditTickets || isAssignmentLocked || updatingFields["sqa_assigned_at"]}
              placeholder="Not set"
              className="w-full h-8"
              hideIcon
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 flex-shrink-0 w-[6.5rem]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Completed</label>
            {!(ticket as { completed_at?: string | null }).completed_at && timestampValidation.completed_at ? (
              <span title={getTimestampWarningMessage("completed_at") || ""} className="cursor-help pt-2">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              </span>
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            <DateTimePicker
              value={parseTimestamp((ticket as { completed_at?: string | null }).completed_at)}
              onChange={(value) => void onTimestampChange("completed_at", value)}
              disabled={!canEditTickets || isAssignmentLocked || (ticket.status !== "completed" && ticket.status !== "cancelled" && ticket.status !== "rejected") || updatingFields["completed_at"]}
              placeholder="Not set"
              className="w-full h-8"
              hideIcon
            />
          </div>
        </div>
      </div>
    </div>
  )
}
