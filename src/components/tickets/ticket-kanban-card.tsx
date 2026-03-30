"use client"

import { memo, useRef } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Square2StackIcon } from "@heroicons/react/20/solid"
import { ClipboardDocumentIcon, ShareIcon } from "@heroicons/react/24/outline"
import type { Ticket } from "@shared/types"
import { cn } from "@client/lib/utils"
import { isDoneStatus, normalizeStatusKey } from "@shared/ticket-statuses"
import { getDueDateDisplay } from "@client/lib/format-dates"
import { PriorityPill } from "@client/components/tickets/priority-pill"
import { TicketTypePill } from "@client/components/ticket-type-select"
import { toast } from "@client/components/ui/toast"
import {
  buildTicketClipboardLabel,
  buildTicketShareUrl,
} from "@client/features/tickets/lib/share-url"
import type { DropPosition } from "@client/features/tickets/components/tickets-board"

export interface TicketKanbanCardProps {
  ticket: Ticket
  subtasksCount?: number
  onSelectTicket: (ticketId: string) => void
  dropIndicatorPosition?: DropPosition | null
}

/** Threshold in pixels — moves smaller than this are treated as a click, not a drag. */
const CLICK_MOVE_THRESHOLD = 4

function DropLine() {
  return (
    <div className="h-0.5 mx-1 rounded-full bg-primary shadow-[0_0_6px_1px_hsl(var(--primary)/0.5)]" />
  )
}

export const TicketKanbanCard = memo(function TicketKanbanCard({
  ticket,
  subtasksCount,
  onSelectTicket,
  dropIndicatorPosition,
}: TicketKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Track pointer-down position so we can distinguish a click from a drag.
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY }
    // Forward to dnd-kit's listener so dragging still initiates on any pointer-down.
    listeners?.onPointerDown?.(e as unknown as PointerEvent)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownPos.current) return
    const dx = Math.abs(e.clientX - pointerDownPos.current.x)
    const dy = Math.abs(e.clientY - pointerDownPos.current.y)
    pointerDownPos.current = null

    // Only treat as a click if the pointer barely moved (i.e. not a drag).
    if (dx < CLICK_MOVE_THRESHOLD && dy < CLICK_MOVE_THRESHOLD) {
      onSelectTicket(ticket.id)
    }
  }

  const isCompleted = isDoneStatus(normalizeStatusKey(ticket.status))
  const dueDate = getDueDateDisplay(ticket.dueDate, isCompleted)
  const assigneeLabel = ticket.assignee?.name || ticket.assignee?.email
  const count = subtasksCount ?? ticket.subtasksCount ?? 0
  const handleCopyShareUrl = () => {
    const shareUrl = buildTicketShareUrl(ticket)
    if (!navigator?.clipboard?.writeText) {
      toast("Clipboard not available", "error")
      return
    }

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => toast("Ticket URL copied"))
      .catch(() => toast("Failed to copy ticket URL", "error"))
  }
  const handleCopyTicketLabel = () => {
    const label = buildTicketClipboardLabel(ticket)
    if (!navigator?.clipboard?.writeText) {
      toast("Clipboard not available", "error")
      return
    }

    navigator.clipboard
      .writeText(label)
      .then(() => toast("Copied ticket info"))
      .catch(() => toast("Failed to copy ticket info", "error"))
  }

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col">
      {dropIndicatorPosition === "before" && <DropLine />}

      <div
        className={cn(
          "group relative rounded-lg border border-border bg-card p-3 shadow-sm my-1",
          "cursor-pointer select-none",
          "transition-all hover:shadow-md hover:border-border/80",
          isDragging && "opacity-40 shadow-lg cursor-grabbing"
        )}
        {...attributes}
        // role and tabIndex come from dnd-kit attributes above; aria-label overrides here.
        aria-label={`Ticket ${ticket.displayId || ticket.id.slice(0, 8)}: ${ticket.title}. Click to open.`}
        // Replace the default listeners with our own onPointerDown so we can intercept.
        // All other listeners (onKeyDown etc.) from dnd-kit are still spread via attributes.
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onKeyDown={(e) => {
          // Keyboard: Enter/Space opens the preview; dnd-kit keyboard handling is via attributes.
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelectTicket(ticket.id)
          }
          listeners?.onKeyDown?.(e as unknown as KeyboardEvent)
        }}
      >
        {/* Card header: ID + type */}
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-muted-foreground tracking-wide">
            {ticket.displayId || ticket.id.slice(0, 8)}
          </span>
          <div className="flex items-center gap-1.5">
            <TicketTypePill type={ticket.type} />
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground"
              aria-label="Copy ticket info"
              title="Copy ticket info"
              onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onPointerUp={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleCopyTicketLabel()
              }}
            >
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground"
              aria-label="Copy share URL"
              title="Copy share URL"
              onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onPointerUp={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleCopyShareUrl()
              }}
            >
              <ShareIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <p className="mb-2.5 text-sm font-medium text-foreground leading-snug line-clamp-2">
          {ticket.title}
        </p>

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

      {dropIndicatorPosition === "after" && <DropLine />}
    </div>
  )
})
