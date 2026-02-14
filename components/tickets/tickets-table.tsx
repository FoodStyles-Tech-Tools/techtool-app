"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"
import Link from "next/link"
import { DateTimePicker } from "@/components/ui/datetime-picker"
import { cn } from "@/lib/utils"
import { formatRelativeDate, getDueDateDisplay, toUTCISOStringPreserveLocal } from "@/lib/format-dates"
import type { Ticket, Department, User as BasicUser } from "@/lib/types"
import { NO_DEPARTMENT_VALUE, UNASSIGNED_VALUE, type SortColumn } from "@/lib/ticket-constants"
import { UserSelectItem, UserSelectValue } from "@/components/user-select-item"
import { TicketTypeSelect } from "@/components/ticket-type-select"
import { TicketPrioritySelect } from "@/components/ticket-priority-select"
import { TicketStatusSelect } from "@/components/ticket-status-select"

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
  onCopyTicket: (ticket: Ticket) => void
  onSelectTicket: (ticketId: string) => void
  departments: Department[]
  users: BasicUser[]
  assigneeEligibleUsers: BasicUser[]
  sqaEligibleUsers: BasicUser[]
  updateTicketField: (
    ticketId: string,
    field: string,
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
  const isActive = sortConfig.column === column
  const Icon = !isActive ? ArrowUpDown : sortConfig.direction === "asc" ? ChevronUp : ChevronDown
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
    >
      <span>{label}</span>
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}

interface TicketRowProps {
  ticket: Ticket
  onCopy: (ticket: Ticket) => void
  onSelectTicket: (ticketId: string) => void
  departments: Department[]
  users: BasicUser[]
  assigneeEligibleUsers: BasicUser[]
  sqaEligibleUsers: BasicUser[]
  updateTicketField: (
    ticketId: string,
    field: string,
    value: string | null | undefined
  ) => Promise<void> | void
  updatingFields: Record<string, string>
  excludeDone: boolean
  canEdit: boolean
}

const TicketRow = memo(function TicketRow({
  ticket,
  onCopy,
  onSelectTicket,
  departments,
  users,
  assigneeEligibleUsers,
  sqaEligibleUsers,
  updateTicketField,
  updatingFields,
  excludeDone,
  canEdit,
}: TicketRowProps) {
  const requestedById = ticket.requested_by?.id || (ticket as { requested_by_id?: string }).requested_by_id
  const dueDateDisplay = getDueDateDisplay(ticket.due_date)
  const dueDateValue = ticket.due_date ? new Date(ticket.due_date) : null
  const safeDueDateValue =
    dueDateValue && !Number.isNaN(dueDateValue.getTime()) ? dueDateValue : null

  return (
    <TableRow
      className={cn(
        "border-b-0 even:bg-muted/15 hover:bg-muted/30",
        dueDateDisplay.highlightClassName
      )}
    >
      <TableCell className="py-2 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => onCopy(ticket)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <span>{ticket.display_id || ticket.id.slice(0, 8)}</span>
        </div>
      </TableCell>
      <TableCell className="py-2 w-[400px] min-w-[300px]">
        <div className="flex flex-col gap-2">
          <div
            className="bg-transparent rounded-md p-2 hover:underline flex flex-col cursor-pointer"
            onClick={() => onSelectTicket(ticket.id)}
          >
            <span className="text-sm">{ticket.title}</span>
            <span className="text-xs text-muted-foreground line-clamp-2">
              {ticket.description || "No description"}
            </span>
          </div>
          <div className="bg-muted/50 rounded-md p-2 flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
              Created {formatRelativeDate(ticket.created_at)}
            </span>
            {ticket.project?.name && (
              <Link
                href={`/projects/${ticket.project.id}`}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Project: {ticket.project.name}
              </Link>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-2">
        <div title={dueDateDisplay.title}>
          <DateTimePicker
            value={safeDueDateValue}
            onChange={(date) =>
              updateTicketField(
                ticket.id,
                "due_date",
                date ? toUTCISOStringPreserveLocal(date) : null
              )
            }
            disabled={!canEdit || !!updatingFields[`${ticket.id}-due_date`]}
            placeholder="No due date"
            hideIcon
            className={cn(
              "h-auto w-auto px-2 py-1 text-xs font-medium rounded-full",
              dueDateDisplay.className
            )}
            renderTriggerContent={() => <span>{dueDateDisplay.label}</span>}
          />
        </div>
      </TableCell>
      <TableCell className="py-2">
        <TicketTypeSelect
          value={ticket.type || "task"}
          onValueChange={(value) => updateTicketField(ticket.id, "type", value)}
          disabled={!canEdit || !!updatingFields[`${ticket.id}-type`]}
        />
      </TableCell>
      <TableCell className="py-2">
        <Select
          value={ticket.department?.id || NO_DEPARTMENT_VALUE}
          onValueChange={(value) =>
            updateTicketField(
              ticket.id,
              "department_id",
              value === NO_DEPARTMENT_VALUE ? null : value
            )
          }
          disabled={!canEdit || !!updatingFields[`${ticket.id}-department_id`]}
        >
          <SelectTrigger className="h-7 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_DEPARTMENT_VALUE}>No Department</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2">
        <TicketStatusSelect
          value={ticket.status}
          onValueChange={(value) => updateTicketField(ticket.id, "status", value)}
          disabled={!canEdit || !!updatingFields[`${ticket.id}-status`]}
          excludeDone={excludeDone}
        />
      </TableCell>
      <TableCell className="py-2">
        <TicketPrioritySelect
          value={ticket.priority}
          onValueChange={(value) => updateTicketField(ticket.id, "priority", value)}
          disabled={!canEdit || !!updatingFields[`${ticket.id}-priority`]}
        />
      </TableCell>
      <TableCell className="py-2">
        <Select
          value={requestedById ?? undefined}
          onValueChange={(value) => updateTicketField(ticket.id, "requested_by_id", value)}
          disabled={!canEdit || !!updatingFields[`${ticket.id}-requested_by_id`]}
        >
          <SelectTrigger className="h-7 w-[150px] text-xs relative overflow-hidden">
            {requestedById ? (
              <div className="absolute left-2 right-8 top-0 bottom-0 flex items-center overflow-hidden">
                <UserSelectValue users={users} value={requestedById} placeholder="Select user" />
              </div>
            ) : (
              <SelectValue placeholder="Select user" />
            )}
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <UserSelectItem key={u.id} user={u} value={u.id} className="text-xs" />
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2">
        <Select
          value={ticket.assignee?.id || UNASSIGNED_VALUE}
          onValueChange={(value) =>
            updateTicketField(
              ticket.id,
              "assignee_id",
              value === UNASSIGNED_VALUE ? null : value
            )
          }
          disabled={!canEdit || !!updatingFields[`${ticket.id}-assignee_id`]}
        >
          <SelectTrigger className="h-7 w-[150px] text-xs relative overflow-hidden">
            {ticket.assignee?.id ? (
              <div className="absolute left-2 right-8 top-0 bottom-0 flex items-center overflow-hidden">
                <UserSelectValue
                  users={assigneeEligibleUsers}
                  value={ticket.assignee.id}
                  placeholder="Unassigned"
                  unassignedValue={UNASSIGNED_VALUE}
                  unassignedLabel="Unassigned"
                />
              </div>
            ) : (
              <SelectValue placeholder="Unassigned" />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
            {assigneeEligibleUsers.map((u) => (
              <UserSelectItem key={u.id} user={u} value={u.id} className="text-xs" />
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2">
        <Select
          value={ticket.sqa_assignee?.id || UNASSIGNED_VALUE}
          onValueChange={(value) =>
            updateTicketField(
              ticket.id,
              "sqa_assignee_id",
              value === UNASSIGNED_VALUE ? null : value
            )
          }
          disabled={!canEdit || !!updatingFields[`${ticket.id}-sqa_assignee_id`]}
        >
          <SelectTrigger className="h-7 w-[150px] text-xs relative overflow-hidden">
            {ticket.sqa_assignee?.id ? (
              <div className="absolute left-2 right-8 top-0 bottom-0 flex items-center overflow-hidden">
                <UserSelectValue
                  users={sqaEligibleUsers}
                  value={ticket.sqa_assignee.id}
                  placeholder="Unassigned"
                  unassignedValue={UNASSIGNED_VALUE}
                  unassignedLabel="Unassigned"
                />
              </div>
            ) : (
              <SelectValue placeholder="Unassigned" />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
            {sqaEligibleUsers.map((u) => (
              <UserSelectItem key={u.id} user={u} value={u.id} className="text-xs" />
            ))}
          </SelectContent>
        </Select>
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
  onCopyTicket,
  onSelectTicket,
  departments,
  users,
  assigneeEligibleUsers,
  sqaEligibleUsers,
  updateTicketField,
  updatingFields,
  excludeDone,
  canEdit,
}: TicketsTableProps) {
  return (
    <div className="rounded-md border border-border/35 bg-muted/10">
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto relative">
        <Table>
          <thead className="sticky top-0 z-20 bg-muted/80 shadow-sm border-b border-border/35">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 py-2 px-4 text-left align-middle">
                {renderSortableHeader("id", "ID", sortConfig, onSort)}
              </TableHead>
              <TableHead className="h-9 py-2 px-4 text-left align-middle w-[400px] min-w-[300px]">
                {renderSortableHeader("title", "Title", sortConfig, onSort)}
              </TableHead>
              <TableHead className="h-9 py-2 px-4 text-left align-middle">
                {renderSortableHeader("due_date", "Due Date", sortConfig, onSort)}
              </TableHead>
              <TableHead className="h-9 py-2 px-4 text-left align-middle">
                {renderSortableHeader("type", "Type", sortConfig, onSort)}
              </TableHead>
              <TableHead className="h-9 py-2 px-4 text-left align-middle">
                {renderSortableHeader("department", "Department", sortConfig, onSort)}
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
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                onCopy={onCopyTicket}
                onSelectTicket={onSelectTicket}
                departments={departments}
                users={users}
                assigneeEligibleUsers={assigneeEligibleUsers}
                sqaEligibleUsers={sqaEligibleUsers}
                updateTicketField={updateTicketField}
                updatingFields={updatingFields}
                excludeDone={excludeDone}
                canEdit={canEdit}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t border-border/35 px-4 py-3">
        <div className="text-sm text-muted-foreground">
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
            <div className="text-sm text-muted-foreground px-2">
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
