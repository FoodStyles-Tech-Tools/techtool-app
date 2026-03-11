"use client"

import { memo } from "react"
import type { Ticket } from "@lib/types"
import { type SortColumn } from "@lib/ticket-constants"
import { formatRelativeDate, getDueDateDisplay } from "@lib/format-dates"
import { normalizeStatusKey, isDoneStatus } from "@lib/ticket-statuses"

const SERVER_SORTABLE_COLUMNS = new Set<SortColumn>([
  "id",
  "title",
  "due_date",
  "type",
  "status",
  "priority",
  "assignee",
])

interface TicketsTableProps {
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
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 hover:text-slate-900"
    >
      <span>{label}</span>
      <span className="text-[10px]">{!isActive ? "Sort" : sortConfig.direction === "asc" ? "Asc" : "Desc"}</span>
    </button>
  )
}

interface TicketRowProps {
  ticket: Ticket
  onSelectTicket: (ticketId: string) => void
}

const TicketRow = memo(function TicketRow({ ticket, onSelectTicket }: TicketRowProps) {
  const assigneeLabel = ticket.assignee?.name || ticket.assignee?.email || "-"
  const dueDate = getDueDateDisplay(
    ticket.dueDate,
    isDoneStatus(normalizeStatusKey(ticket.status))
  )

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2 text-xs font-mono text-slate-500">
        <span>{ticket.displayId || ticket.id.slice(0, 8)}</span>
      </td>
      <td className="w-[400px] min-w-[300px] px-4 py-2">
        <button
          type="button"
          onClick={() => onSelectTicket(ticket.id)}
          className="truncate text-sm text-left text-slate-900 hover:underline"
        >
          {ticket.title}
        </button>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-slate-900">
          <span>{ticket.status}</span>
        </div>
      </td>
      <td className="px-4 py-2">
        <span className="text-xs capitalize text-slate-900">{ticket.priority}</span>
      </td>
      <td className="px-4 py-2">
        <span className="text-xs text-slate-900">{assigneeLabel}</span>
      </td>
      <td className="px-4 py-2">
        <span className="text-xs text-slate-900">{ticket.project?.name || "No project"}</span>
      </td>
      <td className="px-4 py-2">
        <span className={["inline-flex rounded-md px-2 py-1 text-[11px] font-medium", dueDate.className].join(" ")}>
          {dueDate.label}
        </span>
      </td>
      <td className="px-4 py-2">
        <span className="text-xs text-slate-500">{formatRelativeDate(ticket.createdAt)}</span>
      </td>
    </tr>
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
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-20 bg-slate-50 border-b">
            <tr>
              <th className="h-9 px-4 py-2 text-left align-middle">
                {renderSortableHeader("id", "ID", sortConfig, onSort)}
              </th>
              <th className="h-9 w-[400px] min-w-[300px] px-4 py-2 text-left align-middle">
                {renderSortableHeader("title", "Title", sortConfig, onSort)}
              </th>
              <th className="h-9 px-4 py-2 text-left align-middle">
                {renderSortableHeader("status", "Status", sortConfig, onSort)}
              </th>
              <th className="h-9 px-4 py-2 text-left align-middle">
                {renderSortableHeader("priority", "Priority", sortConfig, onSort)}
              </th>
              <th className="h-9 px-4 py-2 text-left align-middle">
                {renderSortableHeader("assignee", "Assignee", sortConfig, onSort)}
              </th>
              <th className="h-9 px-4 py-2 text-left align-middle">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Project</span>
              </th>
              <th className="h-9 px-4 py-2 text-left align-middle">
                {renderSortableHeader("due_date", "Due", sortConfig, onSort)}
              </th>
              <th className="h-9 px-4 py-2 text-left align-middle">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Created</span>
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} onSelectTicket={onSelectTicket} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <div className="text-sm text-slate-500">
          Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of {totalCount} tickets
        </div>
        <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <div className="text-sm text-slate-500 px-2">
              Page {currentPage} of {totalPages || 1}
            </div>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages || 1, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
