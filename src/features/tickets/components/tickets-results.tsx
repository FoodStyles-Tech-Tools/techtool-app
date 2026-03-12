"use client"

import type { ComponentProps } from "react"
import { TicketsTable } from "@client/components/tickets/tickets-table"
import { LoadingIndicator } from "@client/components/ui/loading-indicator"
import type { Ticket } from "@shared/types"

type TicketsResultsProps = {
  loading: boolean
  filteredTickets: Ticket[]
  hasSearchQuery: boolean
  tableProps: ComponentProps<typeof TicketsTable>
}

export function TicketsResults({
  loading,
  filteredTickets,
  hasSearchQuery,
  tableProps,
}: TicketsResultsProps) {
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
