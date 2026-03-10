"use client"

import type { ComponentProps } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { TicketsTable } from "@/components/tickets/tickets-table"
import type { Ticket } from "@/lib/types"

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
        <p className="text-sm text-slate-500">
          {hasSearchQuery ? "No tickets found" : "No tickets yet."}
        </p>
      </div>
    )
  }
  return <TicketsTable {...tableProps} />
}
