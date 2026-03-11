"use client"

import { Link } from "react-router-dom"
import { useMemo } from "react"
import { format } from "date-fns"
import { Badge } from "@client/components/ui/badge"
import { PageLayout } from "@client/components/ui/page-layout"
import { PageHeader } from "@client/components/ui/page-header"
import { DataState } from "@client/components/ui/data-state"
import { EntityTableShell } from "@client/components/ui/entity-table-shell"
import { useTickets } from "@client/features/tickets/hooks/use-tickets"

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
    <PageLayout>
      <PageHeader
        title="Deleted tickets"
        description="Archived tickets that have been removed from the active queue."
        actions={
          <Badge variant="outline" className="text-xs">
            {rows.length} ticket{rows.length === 1 ? "" : "s"}
          </Badge>
        }
      />
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
                    to={`/tickets/${String(row.displayId).toLowerCase()}`}
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
    </PageLayout>
  )
}


