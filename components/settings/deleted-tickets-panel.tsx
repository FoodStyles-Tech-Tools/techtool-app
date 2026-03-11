"use client"

import Link from "@/src/compat/link"
import { useMemo } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { DataState } from "@/components/ui/data-state"
import { EntityTableShell } from "@/components/ui/entity-table-shell"
import { useTickets } from "@/hooks/use-tickets"

export function DeletedTicketsPanel() {
  const { data: tickets = [], isLoading } = useTickets({
    status: "archived",
    realtime: false,
    limit: 100,
    page: 1,
    enabled: true,
  })

  const rows = useMemo(
    () =>
      tickets.map((ticket) => {
        const archivedInfo = ticket.reason?.archived
        return {
          id: ticket.id,
          displayId: ticket.displayId || ticket.id.slice(0, 8).toUpperCase(),
          title: ticket.title,
          project: ticket.project?.name || "No Project",
          archivedAt: archivedInfo?.archivedAt || null,
          archivedReason: archivedInfo?.reason || "",
        }
      }),
    [tickets]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Deleted</h3>
        <Badge variant="outline" className="text-xs">
          {rows.length} ticket{rows.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <DataState
        loading={isLoading}
        isEmpty={!isLoading && rows.length === 0}
        emptyTitle="No deleted tickets yet"
        emptyDescription="Archived tickets will appear here."
        loadingTitle="Loading deleted tickets"
        loadingDescription="Please wait while deleted tickets are loaded."
      >
        <EntityTableShell>
          <div className="grid grid-cols-[140px_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.6fr)] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <div>Ticket</div>
            <div>Title</div>
            <div>Project</div>
            <div>Deleted</div>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-200">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[140px_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.6fr)] items-start gap-3 px-3 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/tickets/${String(row.displayId).toLowerCase()}`}
                    className="inline-flex h-7 items-center rounded-md px-2 font-mono text-xs hover:bg-slate-100"
                  >
                    {row.displayId}
                  </Link>
                </div>
                <div className="truncate text-xs">{row.title}</div>
                <div className="truncate text-xs text-slate-500">{row.project}</div>
                <div className="space-y-0.5 text-xs text-slate-500">
                  {row.archivedAt ? (
                    <div>{format(new Date(row.archivedAt), "MMM d, yyyy 'at' h:mm a")}</div>
                  ) : (
                    <div>-</div>
                  )}
                  {row.archivedReason ? <div className="line-clamp-2 text-[11px]">{row.archivedReason}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </EntityTableShell>
      </DataState>
    </div>
  )
}


