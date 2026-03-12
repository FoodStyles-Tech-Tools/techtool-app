"use client"

import { memo } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Square2StackIcon } from "@heroicons/react/20/solid"
import type { Ticket } from "@shared/types"
import { cn } from "@client/lib/utils"
import { isDoneStatus, normalizeStatusKey } from "@shared/ticket-statuses"
import { getDueDateDisplay } from "@client/lib/format-dates"
import { PriorityPill } from "@client/components/tickets/priority-pill"
import { TicketTypePill } from "@client/components/ticket-type-select"

export interface TicketKanbanCardProps {
  ticket: Ticket
  subtasksCount?: number
  onSelectTicket: (ticketId: string) => void
}

export const TicketKanbanCard = memo(function TicketKanbanCard({
  ticket,
  subtasksCount,
  onSelectTicket,
}: TicketKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isCompleted = isDoneStatus(normalizeStatusKey(ticket.status))
  const dueDate = getDueDateDisplay(ticket.dueDate, isCompleted)
  const assigneeLabel = ticket.assignee?.name || ticket.assignee?.email
  const count = subtasksCount ?? ticket.subtasksCount ?? 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border border-border bg-card p-3 shadow-sm",
        "cursor-grab active:cursor-grabbing select-none",
        "transition-all hover:shadow-md hover:border-border/80",
        isDragging && "opacity-40 shadow-lg"
      )}
      aria-label={`Ticket ${ticket.displayId || ticket.id.slice(0, 8)}: ${ticket.title}`}
      {...attributes}
      {...listeners}
    >
      {/* Card header: ID + type */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-muted-foreground tracking-wide">
          {ticket.displayId || ticket.id.slice(0, 8)}
        </span>
        <TicketTypePill type={ticket.type} />
      </div>

      {/* Title — clickable, opens preview */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onSelectTicket(ticket.id)
        }}
        className="mb-2.5 block w-full text-left text-sm font-medium text-foreground leading-snug line-clamp-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        {ticket.title}
      </button>

      {/* Priority + due date row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <PriorityPill priority={ticket.priority} />

        {ticket.dueDate && (
          <span
            className={cn(
              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] border font-medium",
              dueDate.isOverdue
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-border bg-muted/50 text-muted-foreground"
            )}
          >
            {dueDate.label}
          </span>
        )}
      </div>

      {/* Assignee + subtasks count */}
      <div className="flex items-center justify-between gap-2">
        {assigneeLabel ? (
          <span
            className="truncate text-xs text-muted-foreground max-w-[140px]"
            title={assigneeLabel}
          >
            {assigneeLabel}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40 italic">Unassigned</span>
        )}

        {count > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground shrink-0"
            title={`${count} subtask${count === 1 ? "" : "s"}`}
          >
            <Square2StackIcon className="h-3 w-3" aria-hidden />
            {count}
          </span>
        )}
      </div>
    </div>
  )
})
