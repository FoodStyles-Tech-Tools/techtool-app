"use client"

import { useCallback, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { format } from "date-fns"
import { formatStatusLabel, normalizeStatusKey, type TicketStatus } from "@/lib/ticket-statuses"
import type { TicketSummary } from "@/lib/types"

const TicketDetailDialog = dynamic(
  () => import("@/components/ticket-detail-dialog").then((mod) => mod.TicketDetailDialog),
  { ssr: false }
)

interface DashboardClientProps {
  tickets: TicketSummary[]
  ticketsError: string | null
  ticketStatuses: TicketStatus[]
}

export function DashboardClient({ tickets, ticketsError, ticketStatuses }: DashboardClientProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }, [])
  const today = useMemo(() => format(new Date(), "EEEE, MMMM d"), [])

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const statusMap = useMemo(
    () => new Map(ticketStatuses.map((status) => [status.key, status])),
    [ticketStatuses]
  )

  const getTicketStatusLabel = useCallback(
    (statusValue: string) => {
      const normalized = normalizeStatusKey(statusValue)
      return statusMap.get(normalized)?.label || formatStatusLabel(statusValue)
    },
    [statusMap]
  )

  return (
    <div className="space-y-8">
      <section className="px-8 py-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{today}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{greeting}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Stay focused and keep the flow going.</p>
      </section>

      <section className="flex justify-center">
        <div className="w-full max-w-5xl space-y-2">
          <div className="px-1">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">My tickets</p>
              <h2 className="mt-1 text-xl font-semibold">In progress</h2>
            </div>
          </div>
          {ticketsError ? (
            <p className="text-sm text-red-500">{ticketsError}</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active tickets assigned to you.</p>
          ) : (
            <div className="relative py-2">
              <div className="flex w-full gap-5 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="flex h-[160px] w-[180px] min-w-[180px] flex-col rounded-[32px] border border-border/40 bg-muted/50 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-primary/50"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {ticket.project?.name || "No Project"}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold line-clamp-2">{ticket.title}</h3>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {ticket.display_id || ticket.id.slice(0, 6)}
                      </span>
                      <span>{getTicketStatusLabel(ticket.status)}</span>
                    </div>
                    <p className="mt-auto text-[11px] text-muted-foreground">
                      {format(new Date(ticket.created_at), "MMM d, yyyy")}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <TicketDetailDialog
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicketId(null)
          }
        }}
      />
    </div>
  )
}
