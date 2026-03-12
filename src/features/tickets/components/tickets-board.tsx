"use client"

import { memo, useMemo, useCallback, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import type { Ticket } from "@shared/types"
import type { TicketStatus } from "@shared/ticket-statuses"
import { isArchivedStatus, normalizeStatusKey, sortTicketStatuses } from "@shared/ticket-statuses"
import { useTicketSubtaskCounts } from "@client/hooks/use-ticket-subtask-counts"
import { TicketKanbanCard } from "@client/components/tickets/ticket-kanban-card"
import { cn } from "@client/lib/utils"

function hexWithAlpha(hex: string, alphaHex = "1a"): string {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex
  return `#${normalized}${alphaHex}`
}

export type DropPosition = "before" | "after"

export interface DropIndicator {
  overId: string
  position: DropPosition
}

interface KanbanColumnProps {
  status: TicketStatus
  tickets: Ticket[]
  subtaskCounts: Record<string, number>
  onSelectTicket: (ticketId: string) => void
  dropIndicator: DropIndicator | null
}

function KanbanColumnInner({
  status,
  tickets,
  subtaskCounts,
  onSelectTicket,
  dropIndicator,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status.key })

  return (
    <div
      className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/40"
      aria-label={`Column: ${status.label}`}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between gap-2 rounded-t-xl px-3 py-2.5 border-b border-border"
        style={{ backgroundColor: hexWithAlpha(status.color, "14") }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: status.color }}
            aria-hidden
          />
          <span className="text-sm font-semibold text-foreground">{status.label}</span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: hexWithAlpha(status.color, "20"),
            color: status.color,
          }}
        >
          {tickets.length}
        </span>
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col overflow-y-auto p-2",
          "min-h-[120px] max-h-[calc(100vh-260px)]",
          isOver && "bg-primary/5 ring-2 ring-inset ring-primary/20 rounded-b-xl"
        )}
      >
        <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => {
            const indicatorPosition =
              dropIndicator?.overId === ticket.id ? dropIndicator.position : null
            return (
              <TicketKanbanCard
                key={ticket.id}
                ticket={ticket}
                subtasksCount={subtaskCounts[ticket.id] ?? ticket.subtasksCount ?? 0}
                onSelectTicket={onSelectTicket}
                dropIndicatorPosition={indicatorPosition}
              />
            )
          })}
        </SortableContext>

        {/* Drop indicator at bottom of column when hovering the column itself (empty column or below all cards) */}
        {dropIndicator?.overId === status.key && (
          <DropLine />
        )}

        {tickets.length === 0 && !dropIndicator && (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="text-xs text-muted-foreground/60">No tickets</p>
          </div>
        )}
      </div>
    </div>
  )
}

const KanbanColumn = memo(KanbanColumnInner)

/** The actual drop indicator line rendered between/around cards */
function DropLine() {
  return (
    <div className="relative h-0.5 mx-1 my-0.5 rounded-full bg-primary shadow-[0_0_6px_1px_hsl(var(--primary)/0.5)]" />
  )
}

export interface TicketsBoardProps {
  tickets: Ticket[]
  statuses: TicketStatus[]
  excludedStatuses: string[]
  loading: boolean
  hasSearchQuery: boolean
  onSelectTicket: (ticketId: string) => void
  onKanbanDrop: (ticketId: string, newStatusKey: string) => Promise<boolean>
  onResetFilters?: () => void
  onCreateTicket?: () => void
}

export function TicketsBoard({
  tickets,
  statuses,
  excludedStatuses,
  loading,
  hasSearchQuery,
  onSelectTicket,
  onKanbanDrop,
  onResetFilters,
  onCreateTicket,
}: TicketsBoardProps) {
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const excludedSet = useMemo(
    () => new Set(excludedStatuses.map((s) => s.toLowerCase())),
    [excludedStatuses]
  )

  const visibleStatuses = useMemo(
    () =>
      sortTicketStatuses(
        statuses.filter(
          (s) => !isArchivedStatus(s.key) && !excludedSet.has(normalizeStatusKey(s.key))
        )
      ),
    [statuses, excludedSet]
  )

  const ticketsByStatus = useMemo(() => {
    const map = new Map<string, Ticket[]>()
    for (const status of visibleStatuses) {
      map.set(status.key, [])
    }
    for (const ticket of tickets) {
      const key = normalizeStatusKey(ticket.status)
      if (map.has(key)) {
        map.get(key)!.push(ticket)
      }
    }
    return map
  }, [tickets, visibleStatuses])

  const allTicketIds = useMemo(() => tickets.map((t) => t.id), [tickets])
  const { data: subtaskCounts = {} } = useTicketSubtaskCounts(allTicketIds)

  const activeTicket = useMemo(
    () => (activeTicketId ? tickets.find((t) => t.id === activeTicketId) ?? null : null),
    [activeTicketId, tickets]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTicketId(String(event.active.id))
    setDropIndicator(null)
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over, active } = event
      if (!over) {
        setDropIndicator(null)
        return
      }

      const overId = String(over.id)
      const activeId = String(active.id)

      // Dragging over the column droppable itself (empty column or below all cards)
      if (visibleStatuses.some((s) => s.key === overId)) {
        setDropIndicator({ overId, position: "after" })
        return
      }

      // Dragging over a ticket card — use the rect to determine top/bottom half
      if (overId !== activeId) {
        const rect = over.rect
        const midY = rect.top + rect.height / 2
        const pointerY = (event.activatorEvent as MouseEvent | TouchEvent | null)
          ? (() => {
              const ev = event.activatorEvent as MouseEvent | TouchEvent
              return "clientY" in ev
                ? ev.clientY + (event.delta?.y ?? 0)
                : (ev as TouchEvent).touches[0]?.clientY + (event.delta?.y ?? 0)
            })()
          : midY

        const position: DropPosition = pointerY < midY ? "before" : "after"
        setDropIndicator({ overId, position })
      }
    },
    [visibleStatuses]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTicketId(null)
      setDropIndicator(null)
      const { active, over } = event
      if (!over) return

      const ticketId = String(active.id)
      let targetStatusKey = String(over.id)

      // If dropping on another ticket, find which column that ticket belongs to
      if (!visibleStatuses.some((s) => s.key === targetStatusKey)) {
        for (const [statusKey, columnTickets] of ticketsByStatus.entries()) {
          if (columnTickets.some((t) => t.id === targetStatusKey)) {
            targetStatusKey = statusKey
            break
          }
        }
      }

      const sourceTicket = tickets.find((t) => t.id === ticketId)
      if (!sourceTicket || normalizeStatusKey(sourceTicket.status) === targetStatusKey) return

      await onKanbanDrop(ticketId, targetStatusKey)
    },
    [tickets, visibleStatuses, ticketsByStatus, onKanbanDrop]
  )

  const handleDragCancel = useCallback(() => {
    setActiveTicketId(null)
    setDropIndicator(null)
  }, [])

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4" aria-label="Loading board">
        {Array.from({ length: 4 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/40 animate-pulse">
            <div className="h-10 rounded-t-xl bg-muted/60 border-b border-border" />
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 3 }).map((_, j) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={j} className="h-24 rounded-lg bg-muted/60" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {hasSearchQuery ? "No tickets match your search." : "No tickets yet."}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {onResetFilters && (
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={onResetFilters}
            >
              Clear filters
            </button>
          )}
          {onCreateTicket && (
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={onCreateTicket}
            >
              Create ticket
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ticket ${active.id}.`,
          onDragOver: ({ active, over }) =>
            over ? `Moving ticket ${active.id} over column ${over.id}.` : `Ticket ${active.id} is not over any column.`,
          onDragEnd: ({ active, over }) =>
            over ? `Dropped ticket ${active.id} into column ${over.id}.` : `Ticket ${active.id} was dropped.`,
          onDragCancel: ({ active }) => `Dragging was cancelled. Ticket ${active.id} was dropped.`,
        },
      }}
    >
      <div
        className="flex gap-3 overflow-x-auto pb-4"
        role="region"
        aria-label="Kanban board"
      >
        {visibleStatuses.map((status) => (
          <KanbanColumn
            key={status.key}
            status={status}
            tickets={ticketsByStatus.get(status.key) ?? []}
            subtaskCounts={subtaskCounts}
            onSelectTicket={onSelectTicket}
            dropIndicator={dropIndicator}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTicket ? (
          <div className="w-72 rotate-1 shadow-xl opacity-95">
            <TicketKanbanCard
              ticket={activeTicket}
              subtasksCount={subtaskCounts[activeTicket.id] ?? activeTicket.subtasksCount ?? 0}
              onSelectTicket={onSelectTicket}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
