"use client"

import type { ComponentProps } from "react"
import { TicketsTable } from "@client/components/tickets/tickets-table"
import { TicketsBoard } from "@client/features/tickets/components/tickets-board"
import { LoadingIndicator } from "@client/components/ui/loading-indicator"
import type { Ticket } from "@shared/types"
import type { TicketStatus } from "@shared/ticket-statuses"

type TicketsResultsProps = {
  loading: boolean
  filteredTickets: Ticket[]
  hasSearchQuery: boolean
  viewMode: "table" | "kanban"
  tableProps: ComponentProps<typeof TicketsTable>
  boardProps: Omit<ComponentProps<typeof TicketsBoard>, "loading" | "hasSearchQuery" | "tickets">
}

export function TicketsResults({
  loading,
  filteredTickets,
  hasSearchQuery,
  viewMode,
  tableProps,
  boardProps,
}: TicketsResultsProps) {
  if (viewMode === "kanban") {
    return (
      <TicketsBoard
        loading={loading}
        tickets={filteredTickets}
        hasSearchQuery={hasSearchQuery}
        {...boardProps}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-md border border-border bg-card">
        <LoadingIndicator variant="block" label="Loading tickets…" />
      </div>
    )
  }

  if (filteredTickets.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          {hasSearchQuery ? "No tickets found" : "No tickets yet."}
        </p>
      </div>
    )
  }

  return <TicketsTable {...tableProps} />
}
