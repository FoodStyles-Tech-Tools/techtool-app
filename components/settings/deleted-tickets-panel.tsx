"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTickets } from "@/hooks/use-tickets"
import { format } from "date-fns"

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
      <div className="rounded-md border">
        <div className="grid grid-cols-[140px_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.6fr)] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          <div>Ticket</div>
          <div>Title</div>
          <div>Project</div>
          <div>Deleted</div>
        </div>
        {isLoading ? (
          <div className="px-3 py-6 text-sm text-muted-foreground">Loading deleted tickets…</div>
        ) : rows.length === 0 ? (
          <div className="px-3 py-6 text-sm text-muted-foreground">
            No deleted tickets yet.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto divide-y">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[140px_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.6fr)] gap-3 px-3 py-2.5 text-xs items-start"
              >
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-mono"
                  >
                    <a href={`/tickets/${String(row.displayId).toLowerCase()}`}>
                      {row.displayId}
                    </a>
                  </Button>
                </div>
                <div className="truncate text-xs">{row.title}</div>
                <div className="truncate text-xs text-muted-foreground">{row.project}</div>
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  {row.archivedAt ? (
                    <div>
                      {format(new Date(row.archivedAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  ) : (
                    <div>—</div>
                  )}
                  {row.archivedReason && (
                    <div className="line-clamp-2 text-[11px]">
                      {row.archivedReason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
