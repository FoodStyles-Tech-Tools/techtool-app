"use client"

import { memo } from "react"
import type { Ticket } from "@shared/types"
import { type SortColumn } from "@shared/ticket-constants"
import { formatRelativeDate, getDueDateDisplay } from "@client/lib/format-dates"
import { normalizeStatusKey, isDoneStatus } from "@shared/ticket-statuses"
import { Button } from "@client/components/ui/button"
import { EntityTableShell } from "@client/components/ui/entity-table-shell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table"

const SERVER_SORTABLE_COLUMNS = new Set<SortColumn>([
  "id",
  "title",
  "due_date",
  "type",
  "status",
  "priority",
  "assignee",
])

export interface TicketsTableProps {
  sortConfig: { column: SortColumn; direction: "asc" | "desc" }
  onSort: (column: SortColumn) => void
  tickets: Ticket[]
  totalCount: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  startIndex: number
  endIndex: number
  onSelectTicket: (ticketId: string) => void
}

function SortableHeader({
  column,
  label,
  sortConfig,
  onSort,
}: {
  column: SortColumn
  label: string
  sortConfig: { column: SortColumn; direction: "asc" | "desc" }
  onSort: (column: SortColumn) => void
}) {
  if (!SERVER_SORTABLE_COLUMNS.has(column)) {
    return <span>{label}</span>
  }

  const isActive = sortConfig.column === column
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex items-center gap-1 hover:text-slate-900"
    >
      <span>{label}</span>
      <span className="text-xs">{!isActive ? "Sort" : sortConfig.direction === "asc" ? "Asc" : "Desc"}</span>
    </button>
  )
}

interface TicketRowProps {
  ticket: Ticket
  onSelectTicket: (ticketId: string) => void
}

const TicketRow = memo(function TicketRow({ ticket, onSelectTicket }: TicketRowProps) {
  const assigneeLabel = ticket.assignee?.name || ticket.assignee?.email || "-"
  const requesterLabel = ticket.requestedBy?.name || ticket.requestedBy?.email || "-"
  const sqaLabel = ticket.sqaAssignee?.name || ticket.sqaAssignee?.email || "-"
  const dueDate = getDueDateDisplay(
    ticket.dueDate,
    isDoneStatus(normalizeStatusKey(ticket.status))
  )

  return (
    <TableRow>
      <TableCell className="py-2 text-xs font-mono text-slate-500">
        {ticket.displayId || ticket.id.slice(0, 8)}
      </TableCell>
      <TableCell className="w-[400px] min-w-[300px] py-2">
        <button
          type="button"
          onClick={() => onSelectTicket(ticket.id)}
          className="truncate text-sm text-left text-slate-900 hover:underline"
        >
          {ticket.title}
        </button>
      </TableCell>
      <TableCell className="py-2 text-sm text-slate-900">
        {ticket.status}
      </TableCell>
      <TableCell className="py-2 text-sm capitalize text-slate-900">
        {ticket.priority}
      </TableCell>
      <TableCell className="py-2 text-sm text-slate-900">
        {assigneeLabel}
      </TableCell>
      <TableCell className="py-2 text-sm text-slate-900">
        {requesterLabel}
      </TableCell>
      <TableCell className="py-2 text-sm text-slate-900">
        {sqaLabel}
      </TableCell>
      <TableCell className="py-2 text-sm text-slate-900">
        {ticket.project?.name || "No project"}
      </TableCell>
      <TableCell className="py-2">
        <span className={["inline-flex rounded-md px-2 py-1 text-xs font-medium", dueDate.className].join(" ")}>
          {dueDate.label}
        </span>
      </TableCell>
      <TableCell className="py-2 text-xs text-slate-500">
        {formatRelativeDate(ticket.createdAt)}
      </TableCell>
    </TableRow>
  )
})

export function TicketsTable({
  sortConfig,
  onSort,
  tickets,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  startIndex,
  endIndex,
  onSelectTicket,
}: TicketsTableProps) {
  return (
    <EntityTableShell
      footer={
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
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
            <span className="text-sm text-slate-500">
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
            <TableHead className="h-9 py-2">
              <SortableHeader column="id" label="ID" sortConfig={sortConfig} onSort={onSort} />
            </TableHead>
            <TableHead className="h-9 w-[400px] min-w-[300px] py-2">
              <SortableHeader column="title" label="Title" sortConfig={sortConfig} onSort={onSort} />
            </TableHead>
            <TableHead className="h-9 py-2">
              <SortableHeader column="status" label="Status" sortConfig={sortConfig} onSort={onSort} />
            </TableHead>
            <TableHead className="h-9 py-2">
              <SortableHeader column="priority" label="Priority" sortConfig={sortConfig} onSort={onSort} />
            </TableHead>
            <TableHead className="h-9 py-2">
              <SortableHeader column="assignee" label="Assignee" sortConfig={sortConfig} onSort={onSort} />
            </TableHead>
            <TableHead className="h-9 py-2">Requester</TableHead>
            <TableHead className="h-9 py-2">SQA</TableHead>
            <TableHead className="h-9 py-2">Project</TableHead>
            <TableHead className="h-9 py-2">
              <SortableHeader column="due_date" label="Due" sortConfig={sortConfig} onSort={onSort} />
            </TableHead>
            <TableHead className="h-9 py-2">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} onSelectTicket={onSelectTicket} />
          ))}
        </TableBody>
      </Table>
    </EntityTableShell>
  )
}
