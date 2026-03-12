"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { Badge } from "@client/components/ui/badge"
import { PageLayout } from "@client/components/ui/page-layout"
import { PageHeader } from "@client/components/ui/page-header"
import { DataState } from "@client/components/ui/data-state"
import { EntityTableShell } from "@client/components/ui/entity-table-shell"
import { useTickets } from "@client/features/tickets/hooks/use-tickets"
import { useTicketPreview } from "@client/features/tickets/context/ticket-preview-context"

export function DeletedTicketsPanel() {
  const { openPreview } = useTicketPreview()
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
          deletedAt: archivedInfo?.archivedAt || null,
          deletedBy: null as string | null,
          reason: archivedInfo?.reason || "",
        }
      }),
    [tickets]
  )

  return (
    <PageLayout>
      <PageHeader
        title="Deleted tickets"
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
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-3 py-2 text-left font-medium text-foreground">Ticket Id</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Title</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Deleted At</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Deleted By</th>
                  <th className="px-3 py-2 text-left font-medium text-foreground">Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          openPreview({
                            ticketId: row.id,
                            slug: String(row.displayId).toLowerCase(),
                          })
                        }
                        className="text-primary underline"
                      >
                        {row.displayId}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-foreground">{row.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.deletedAt ? format(new Date(row.deletedAt), "MMM d, yyyy h:mm a") : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.deletedBy ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </EntityTableShell>
      </DataState>
    </PageLayout>
  )
}


