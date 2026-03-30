"use client"

import { memo, useCallback } from "react"
import type { Ticket } from "@shared/types"
import { cn } from "@client/lib/utils"
import { formatRelativeDate, getDueDateDisplay } from "@client/lib/format-dates"
import { normalizeStatusKey, isDoneStatus, formatStatusLabel } from "@shared/ticket-statuses"
import type { TicketStatus } from "@shared/ticket-statuses"
import { useTicketStatuses } from "@client/hooks/use-ticket-statuses"
import { useTicketSubtaskCounts } from "@client/hooks/use-ticket-subtask-counts"
import { Button } from "@client/components/ui/button"
import { Checkbox } from "@client/components/ui/checkbox"
import { StatusPill } from "@client/components/tickets/status-pill"
import { PriorityPill } from "@client/components/tickets/priority-pill"
import { TicketTypePill } from "@client/components/ticket-type-select"
import { EntityTableShell } from "@client/components/ui/entity-table-shell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table"

export interface TicketsTableProps {
  tickets: Ticket[]
  totalCount: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  startIndex: number
  endIndex: number
  onSelectTicket: (ticketId: string) => void
  selectedTicketIds?: string[]
  onToggleTicketSelection?: (ticketId: string, checked: boolean) => void
  onToggleSelectAllVisible?: (checked: boolean) => void
  selectionDisabled?: boolean
}

interface TicketRowProps {
  ticket: Ticket
  subtaskDisplayCount: string | number
  onSelectTicket: (ticketId: string) => void
  getStatusLabel: (statusKey: string) => string
  statusMap: Map<string, TicketStatus>
  selectionEnabled: boolean
  isSelected: boolean
  onToggleTicketSelection?: (ticketId: string, checked: boolean) => void
  selectionDisabled: boolean
}

const TicketRow = memo(function TicketRow({
  ticket,
  subtaskDisplayCount,
  onSelectTicket,
  getStatusLabel,
  statusMap,
  selectionEnabled,
  isSelected,
  onToggleTicketSelection,
  selectionDisabled,
}: TicketRowProps) {
  const assigneeLabel = ticket.assignee?.name || ticket.assignee?.email || "-"
  const requesterLabel = ticket.requestedBy?.name || ticket.requestedBy?.email || "-"
  const sqaLabel = ticket.sqaAssignee?.name || ticket.sqaAssignee?.email || "-"
  const dueDate = getDueDateDisplay(
    ticket.dueDate,
    isDoneStatus(normalizeStatusKey(ticket.status))
  )
  const statusInfo = statusMap.get(normalizeStatusKey(ticket.status))

  return (
    <TableRow>
      {selectionEnabled ? (
        <TableCell className="w-8 px-2 py-2">
          <Checkbox
            checked={isSelected}
            disabled={selectionDisabled}
            onChange={(event) => onToggleTicketSelection?.(ticket.id, event.target.checked)}
            aria-label={`Select ticket ${ticket.displayId || ticket.id.slice(0, 8)}`}
          />
        </TableCell>
      ) : null}
      <TableCell className="py-2 text-sm text-muted-foreground">
        {ticket.displayId || ticket.id.slice(0, 8)}
      </TableCell>
      <TableCell className="w-[400px] min-w-[300px] py-2 align-top">
        <button
          type="button"
          onClick={() => onSelectTicket(ticket.id)}
          className="block w-full text-left text-sm font-normal text-primary underline"
        >
          {ticket.title}
        </button>
      </TableCell>
      <TableCell className="whitespace-nowrap py-2 text-sm text-foreground text-center">
        {subtaskDisplayCount}
      </TableCell>
      <TableCell className="whitespace-nowrap py-2 text-sm text-foreground">
        {statusInfo?.color ? (
          <StatusPill label={statusInfo.label} color={statusInfo.color} />
        ) : (
          getStatusLabel(ticket.status)
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap py-2 text-sm text-foreground">
        <TicketTypePill type={ticket.type} />
      </TableCell>
      <TableCell className="whitespace-nowrap py-2 text-sm text-foreground">
        <PriorityPill priority={ticket.priority} />
      </TableCell>
      <TableCell className="py-2 text-sm text-foreground">
        {assigneeLabel}
      </TableCell>
      <TableCell className="py-2 text-sm text-foreground">
        {requesterLabel}
      </TableCell>
      <TableCell className="py-2 text-sm text-foreground">
        {sqaLabel}
      </TableCell>
      <TableCell className="py-2 text-sm text-foreground">
        {ticket.project?.name || "No project"}
      </TableCell>
      <TableCell
        className={cn(
          "py-2 text-sm",
          dueDate.isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
        )}
      >
        {dueDate.label}
      </TableCell>
      <TableCell className="py-2 text-sm text-muted-foreground">
        {formatRelativeDate(ticket.createdAt)}
      </TableCell>
    </TableRow>
  )
})

export function TicketsTable({
  tickets,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  startIndex,
  endIndex,
  onSelectTicket,
  selectedTicketIds = [],
  onToggleTicketSelection,
  onToggleSelectAllVisible,
  selectionDisabled = false,
}: TicketsTableProps) {
  const { statusMap } = useTicketStatuses()
  const parentTicketIds = tickets.map((ticket) => ticket.id)
  const { data: subtaskCounts = {} } = useTicketSubtaskCounts(parentTicketIds)
  const selectionEnabled =
    typeof onToggleTicketSelection === "function" && typeof onToggleSelectAllVisible === "function"
  const allVisibleSelected =
    selectionEnabled &&
    tickets.length > 0 &&
    tickets.every((ticket) => selectedTicketIds.includes(ticket.id))
  const getStatusLabel = useCallback(
    (statusKey: string) =>
      statusMap.get(normalizeStatusKey(statusKey))?.label ?? formatStatusLabel(statusKey),
    [statusMap]
  )

  return (
    <EntityTableShell
      footer={
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of {totalCount} tickets
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => onPageChange(Math.min(totalPages || 1, currentPage + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      }
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selectionEnabled ? (
              <TableHead className="w-8 px-2 py-2">
                <Checkbox
                  checked={allVisibleSelected}
                  disabled={selectionDisabled}
                  onChange={(event) => onToggleSelectAllVisible?.(event.target.checked)}
                  aria-label="Select all visible tickets"
                />
              </TableHead>
            ) : null}
            <TableHead className="h-9 py-2">ID</TableHead>
            <TableHead className="h-9 w-[400px] min-w-[300px] py-2">Title</TableHead>
            <TableHead className="h-9 py-2 text-center">Subtasks</TableHead>
            <TableHead className="h-9 py-2">Status</TableHead>
            <TableHead className="h-9 py-2">Type</TableHead>
            <TableHead className="h-9 py-2">Priority</TableHead>
            <TableHead className="h-9 py-2">Assignee</TableHead>
            <TableHead className="h-9 py-2">Requester</TableHead>
            <TableHead className="h-9 py-2">SQA</TableHead>
            <TableHead className="h-9 py-2">Project</TableHead>
            <TableHead className="h-9 py-2">Due</TableHead>
            <TableHead className="h-9 py-2">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => {
            const hasLiveCount = Object.prototype.hasOwnProperty.call(subtaskCounts, ticket.id)
            const rawCount = hasLiveCount ? subtaskCounts[ticket.id] ?? 0 : ticket.subtasksCount ?? 0
            const displayCount = rawCount > 0 ? rawCount : "-"

            return (
              <TicketRow
                key={ticket.id}
                subtaskDisplayCount={displayCount}
                ticket={{
                  ...ticket,
                  subtasksCount: rawCount,
                }}
                onSelectTicket={onSelectTicket}
                getStatusLabel={getStatusLabel}
                statusMap={statusMap}
                selectionEnabled={selectionEnabled}
                isSelected={selectedTicketIds.includes(ticket.id)}
                onToggleTicketSelection={onToggleTicketSelection}
                selectionDisabled={selectionDisabled}
              />
            )
          })}
        </TableBody>
      </Table>
    </EntityTableShell>
  )
}
