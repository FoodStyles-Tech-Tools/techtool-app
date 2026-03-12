"use client"

import { memo, useCallback } from "react"
import type { Ticket } from "@shared/types"
import { cn } from "@client/lib/utils"
import { formatRelativeDate, getDueDateDisplay } from "@client/lib/format-dates"
import { normalizeStatusKey, isDoneStatus, formatStatusLabel } from "@shared/ticket-statuses"
import type { TicketStatus } from "@shared/ticket-statuses"
import { useTicketStatuses } from "@client/hooks/use-ticket-statuses"
import { Button } from "@client/components/ui/button"
import { StatusPill } from "@client/components/tickets/status-pill"
import { PriorityPill } from "@client/components/tickets/priority-pill"
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
}

interface TicketRowProps {
  ticket: Ticket
  onSelectTicket: (ticketId: string) => void
  getStatusLabel: (statusKey: string) => string
  statusMap: Map<string, TicketStatus>
}

const TicketRow = memo(function TicketRow({ ticket, onSelectTicket, getStatusLabel, statusMap }: TicketRowProps) {
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
      <TableCell className="py-2 text-sm text-muted-foreground">
        {ticket.displayId || ticket.id.slice(0, 8)}
      </TableCell>
      <TableCell className="w-[400px] min-w-[300px] py-2 align-top">
        <button
          type="button"
          onClick={() => onSelectTicket(ticket.id)}
          className="text-left text-sm font-normal text-foreground hover:underline"
        >
          {ticket.title}
        </button>
      </TableCell>
      <TableCell className="whitespace-nowrap py-2 text-sm text-foreground">
        {statusInfo?.color ? (
          <StatusPill label={statusInfo.label} color={statusInfo.color} />
        ) : (
          getStatusLabel(ticket.status)
        )}
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
      <TableCell className={cn("py-2 text-sm", dueDate.isOverdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
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
}: TicketsTableProps) {
  const { statusMap } = useTicketStatuses()
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
            <TableHead className="h-9 py-2">ID</TableHead>
            <TableHead className="h-9 w-[400px] min-w-[300px] py-2">Title</TableHead>
            <TableHead className="h-9 py-2">Status</TableHead>
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
          {tickets.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              onSelectTicket={onSelectTicket}
              getStatusLabel={getStatusLabel}
              statusMap={statusMap}
            />
          ))}
        </TableBody>
      </Table>
    </EntityTableShell>
  )
}
