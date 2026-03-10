"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table"
import { Copy, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"
import type { Ticket, Department, User as BasicUser } from "@/lib/types"
import {
  type SortColumn,
} from "@/lib/ticket-constants"

const SERVER_SORTABLE_COLUMNS = new Set<SortColumn>([
  "id",
  "title",
  "type",
  "status",
  "priority",
  "requested_by",
  "assignee",
  "sqa_assignee",
])

interface TicketsTableProps {
  sortConfig: { column: SortColumn; direction: "asc" | "desc" }
  onSort: (column: SortColumn) => void
  tickets: Ticket[]
  subtaskCountMap: Record<string, number>
  totalCount: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  startIndex: number
  endIndex: number
  onCopyTicket: (ticket: Ticket) => void
  onSelectTicket: (ticketId: string) => void
  departments: Department[]
  users: BasicUser[]
  assigneeEligibleUsers: BasicUser[]
  sqaEligibleUsers: BasicUser[]
  updateTicketField: (
    ticketId: string,
    field: TicketMutationField,
    value: string | null | undefined
  ) => Promise<void> | void
  updatingFields: Record<string, string>
  excludeDone: boolean
  canEdit: boolean
}

function renderSortableHeader(
  column: SortColumn,
  label: string,
  sortConfig: { column: SortColumn; direction: "asc" | "desc" },
  onSort: (column: SortColumn) => void
) {
  if (!SERVER_SORTABLE_COLUMNS.has(column)) {
    return <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
  }

  const isActive = sortConfig.column === column
  const Icon = !isActive ? ArrowUpDown : sortConfig.direction === "asc" ? ChevronUp : ChevronDown
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 hover:text-slate-900"
    >
      <span>{label}</span>
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}

interface TicketRowProps {
  ticket: Ticket
  onSelectTicket: (ticketId: string) => void
  // The remaining props are still accepted via TicketsTableProps but unused here,
  // kept for compatibility with the existing caller.
  departments?: Department[]
  users?: BasicUser[]
  assigneeEligibleUsers?: BasicUser[]
  sqaEligibleUsers?: BasicUser[]
}

const TicketRow = memo(function TicketRow({ ticket, onSelectTicket }: TicketRowProps) {
  const requesterLabel = ticket.requestedBy?.name || ticket.requestedBy?.email || "-"
  const assigneeLabel = ticket.assignee?.name || ticket.assignee?.email || "-"
  const sqaLabel = ticket.sqaAssignee?.name || ticket.sqaAssignee?.email || "-"

  return (
    <TableRow>
      <TableCell className="py-2 text-xs font-mono text-slate-500">
        <span>{ticket.displayId || ticket.id.slice(0, 8)}</span>
      </TableCell>
      <TableCell className="py-2 w-[400px] min-w-[300px]">
        <button
          type="button"
          onClick={() => onSelectTicket(ticket.id)}
          className="truncate text-sm text-left text-slate-900 hover:underline"
        >
          {ticket.title}
        </button>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-slate-900">{ticket.type || "-"}</span>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-slate-900">{ticket.status}</span>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-slate-900">{ticket.priority}</span>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-slate-900">{requesterLabel}</span>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-slate-900">{assigneeLabel}</span>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-slate-900">{sqaLabel}</span>
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
    <div className="rounded-md border bg-white">
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto relative">
        <Table>
          <thead className="sticky top-0 z-20 bg-slate-50 border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 py-2 px-4 text-left align-middle">
                {renderSortableHeader("id", "ID", sortConfig, onSort)}
              </TableHead>
              <TableHead className="h-9 py-2 px-4 text-left align-middle w-[400px] min-w-[300px]">
                {renderSortableHeader("title", "Title", sortConfig, onSort)}
              </TableHead>
              <TableHead className="h-9 py-2 px-4 text-left align-middle">
                {renderSortableHeader("type", "Type", sortConfig, onSort)}
              </TableHead>
              <TableHead className="h-9 py-2 px-4 text-left align-middle">
                {renderSortableHeader("status", "Status", sortConfig, onSort)}
              </TableHead>
              <TableHead className="h-9 py-2 px-4 text-left align-middle">
                {renderSortableHeader("priority", "Priority", sortConfig, onSort)}
              </TableHead>
              <TableHead className="h-9 py-2 px-4 text-left align-middle">
                {renderSortableHeader("requested_by", "Requested By", sortConfig, onSort)}
              </TableHead>
              <TableHead className="h-9 py-2 px-4 text-left align-middle">
                {renderSortableHeader("assignee", "Assignee", sortConfig, onSort)}
              </TableHead>
              <TableHead className="h-9 py-2 px-4 text-left align-middle">
                {renderSortableHeader("sqa_assignee", "SQA Assignee", sortConfig, onSort)}
              </TableHead>
            </TableRow>
          </thead>
          <TableBody className="[&_tr:last-child]:border-0">
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} onSelectTicket={onSelectTicket} />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <div className="text-sm text-slate-500">
          Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of {totalCount} tickets
        </div>
        <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8"
            >
              Previous
            </Button>
            <div className="text-sm text-slate-500 px-2">
              Page {currentPage} of {totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages || 1, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="h-8"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
