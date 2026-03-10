"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { getDueDateDisplay } from "@/lib/format-dates"
import type { Ticket } from "@/lib/types"
import { TicketTypeIcon } from "@/components/ticket-type-select"
import { TicketPriorityIcon } from "@/components/ticket-priority-select"
import { isArchivedStatus, isDoneStatus, normalizeStatusKey } from "@/lib/ticket-statuses"

export interface KanbanColumn {
  id: string
  label: string
  color: string
}

export interface TicketsKanbanProps {
  columns: KanbanColumn[]
  ticketsByStatus: Record<string, Ticket[]>
  subtaskCountMap: Record<string, number>
  draggedTicket: string | null
  dragOverColumn: string | null
  dropIndicator: { columnId: string; ticketId: string | null; top: number } | null
  justDroppedTicketId: string | null
  canEditTickets: boolean
  onSelectTicket: (ticketId: string) => void
  onDragStart: (e: React.DragEvent, ticketId: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, columnId: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, columnId: string) => void
  kanbanScrollRef: React.RefObject<HTMLDivElement | null>
  kanbanTopScrollRef: React.RefObject<HTMLDivElement | null>
  kanbanScrollTrackWidth: number
  onScrollBoard: (scrollLeft: number) => void
  onScrollTop: (scrollLeft: number) => void
  onRefreshTrackWidth: () => void
}

export function TicketsKanban({
  columns,
  ticketsByStatus,
  subtaskCountMap,
  draggedTicket,
  dragOverColumn,
  dropIndicator,
  justDroppedTicketId,
  canEditTickets,
  onSelectTicket,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  kanbanScrollRef,
  kanbanTopScrollRef,
  kanbanScrollTrackWidth,
  onScrollBoard,
  onScrollTop,
  onRefreshTrackWidth,
}: TicketsKanbanProps) {
  return (
    <div className="flex flex-col min-h-0">
      <div
        ref={kanbanTopScrollRef as React.RefObject<HTMLDivElement>}
        className="mb-2 h-4 overflow-x-auto overflow-y-hidden flex-shrink-0"
        onScroll={(e) => onScrollTop(e.currentTarget.scrollLeft)}
      >
        <div style={{ width: Math.max(kanbanScrollTrackWidth, 1), height: 1 }} />
      </div>
      <div
        ref={kanbanScrollRef as React.RefObject<HTMLDivElement>}
        className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 max-h-[70vh]"
        onScroll={(e) => {
          onScrollBoard(e.currentTarget.scrollLeft)
          onRefreshTrackWidth()
        }}
      >
        {columns.map((column) => {
          const columnTickets = ticketsByStatus[column.id] || []
          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80 flex flex-col rounded-lg"
              onDragOver={(e) => onDragOver(e, column.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, column.id)}
            >
              <div className="border border-slate-200 rounded-lg bg-slate-50 p-3 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Circle
                      className="h-3 w-3"
                      style={{ color: column.color, fill: column.color }}
                    />
                    <h3 className="text-sm font-medium">{column.label}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {columnTickets.length}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 overflow-y-auto flex-1 min-h-0 relative">
                  {dropIndicator?.columnId === column.id && (
                    <div
                      className="absolute left-0 right-0 h-1 z-10 pointer-events-none rounded-full bg-blue-500"
                      style={{ top: `${dropIndicator.top}px` }}
                    />
                  )}
                  {columnTickets.map((ticket) => {
                    const dueDateDisplay = getDueDateDisplay(ticket.dueDate, isDoneStatus(normalizeStatusKey(ticket.status)))
                    const subtaskCount = subtaskCountMap[ticket.id] || 0
                    if (isArchivedStatus(ticket.status)) return null
                    return (
                      <Card
                        key={ticket.id}
                        data-ticket-id={ticket.id}
                        className={cn(
                          "p-4 cursor-pointer border border-slate-200 bg-white shadow-sm",
                          dueDateDisplay.isOverdue ? "!border-red-500 !bg-red-50" : "",
                        )}
                        draggable={canEditTickets}
                        onDragStart={(e) => onDragStart(e, ticket.id)}
                        onDragEnd={onDragEnd}
                        onClick={() => onSelectTicket(ticket.id)}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                {ticket.displayId && (
                                  <span className="text-xs font-mono text-slate-500">
                                    {ticket.displayId}
                                  </span>
                                )}
                                <TicketTypeIcon type={ticket.type || "task"} />
                                <TicketPriorityIcon priority={ticket.priority} />
                              </div>
                              <h4 className="text-sm font-medium line-clamp-2 leading-tight">
                                {ticket.title}
                              </h4>
                              {subtaskCount > 0 ? (
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {subtaskCount} subtask{subtaskCount === 1 ? "" : "s"}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div>
                            <Badge
                              title={dueDateDisplay.title}
                              className={`text-[11px] font-medium ${dueDateDisplay.className}`}
                            >
                              {dueDateDisplay.label}
                            </Badge>
                          </div>
                          {ticket.assignee && (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={ticket.assignee.image || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {ticket.assignee.name?.[0]?.toUpperCase() ??
                                    ticket.assignee.email[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate text-xs text-slate-500">
                                {ticket.assignee.name || ticket.assignee.email}
                              </span>
                            </div>
                          )}
                          {ticket.department && (
                            <Badge variant="outline" className="text-xs">
                              {ticket.department.name}
                            </Badge>
                          )}
                          {ticket.project && (
                            <Badge variant="outline" className="text-xs">
                              {ticket.project.name}
                            </Badge>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
