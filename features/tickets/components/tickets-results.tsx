"use client"

import type { ComponentProps } from "react"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { TicketsKanban } from "@/components/tickets/tickets-kanban"
import { TicketsTable } from "@/components/tickets/tickets-table"
import type { Ticket } from "@/lib/types"

const GanttChart = dynamic(
  () => import("@/components/gantt-chart").then((mod) => mod.GanttChart),
  { ssr: false }
)

type TicketsResultsProps = {
  loading: boolean
  filteredTickets: Ticket[]
  hasSearchQuery: boolean
  view: "table" | "kanban" | "gantt"
  projectFilter: string
  sortedTickets: Ticket[]
  sprints: Array<{ id: string; name: string; status: string }>
  epics: Array<{ id: string; name: string; color: string }>
  onSelectTicket: (ticketId: string) => void
  kanbanProps: ComponentProps<typeof TicketsKanban>
  tableProps: ComponentProps<typeof TicketsTable>
}

export function TicketsResults({
  loading,
  filteredTickets,
  hasSearchQuery,
  view,
  projectFilter,
  sortedTickets,
  sprints,
  epics,
  onSelectTicket,
  kanbanProps,
  tableProps,
}: TicketsResultsProps) {
  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (filteredTickets.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          {hasSearchQuery ? "No tickets found" : "No tickets yet."}
        </p>
      </div>
    )
  }

  if (view === "kanban") {
    return <TicketsKanban {...kanbanProps} />
  }

  if (view === "gantt") {
    if (projectFilter === "all") {
      return (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Select a project to view the Gantt chart.
          </p>
        </div>
      )
    }

    return (
      <div className="flex flex-col min-h-0">
        <GanttChart
          tickets={sortedTickets}
          sprints={sprints}
          epics={epics}
          onTicketClick={onSelectTicket}
        />
      </div>
    )
  }

  return <TicketsTable {...tableProps} />
}
