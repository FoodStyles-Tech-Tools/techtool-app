"use client"

import type { ComponentProps } from "react"
import { TicketsTable } from "@client/components/tickets/tickets-table"
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
    return <div className="rounded-md border border-slate-200" />
  }

  if (filteredTickets.length === 0) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">
          {hasSearchQuery ? "No tickets found" : "No tickets yet."}
        </p>
      </div>
    )
  }
  return <TicketsTable {...tableProps} />
}
