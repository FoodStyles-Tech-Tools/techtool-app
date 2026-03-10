"use client"

import { format } from "date-fns"
import { AlertTriangle, ExternalLink } from "lucide-react"
import type { Ticket, TicketDetailRelations } from "@/lib/types"

type TicketDetailRelationsSectionProps = {
  ticket: Ticket
  relations: TicketDetailRelations
}

export function TicketDetailRelationsSection({
  ticket,
  relations,
}: TicketDetailRelationsSectionProps) {
  return (
    <>
      <div className="flex items-start gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Relations</label>
        <div className="flex-1 min-w-0 space-y-1.5">
          {relations.parent ? (
            <a
              href={`/tickets/${String(relations.parent.display_id || relations.parent.id).toLowerCase()}`}
              className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted/50"
            >
              <span className="truncate">
                Parent: {(relations.parent.display_id || relations.parent.id.slice(0, 8)).toUpperCase()} · {relations.parent.title}
              </span>
              <ExternalLink className="ml-2 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            </a>
          ) : null}
          {(relations.mentioned_in_comments || []).map((mention) => (
            <a
              key={mention.ticket.id}
              href={`/tickets/${String(mention.ticket.display_id || mention.ticket.id).toLowerCase()}`}
              className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted/50"
            >
              <span className="truncate">
                Mentioned in {mention.comment_ids.length} comment{mention.comment_ids.length === 1 ? "" : "s"} on {(mention.ticket.display_id || mention.ticket.id.slice(0, 8)).toUpperCase()} · {mention.ticket.title}
              </span>
              <ExternalLink className="ml-2 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            </a>
          ))}
          {!relations.parent && (relations.mentioned_in_comments || []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No relations yet.</p>
          ) : null}
        </div>
      </div>

      {(ticket.status === "cancelled" || ticket.status === "rejected") &&
      (ticket.reason?.cancelled || ticket.reason?.rejected) ? (
        <div className="flex items-start gap-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Reason</label>
          <div className="flex-1 min-w-0">
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {(() => {
                    const reasonData = ticket.status === "rejected" ? ticket.reason?.rejected : ticket.reason?.cancelled
                    if (!reasonData) return null
                    const reasonAt = "rejectedAt" in reasonData ? reasonData.rejectedAt : reasonData.cancelledAt
                    return (
                      <>
                        <p className="text-sm font-medium text-foreground mb-1">
                          {ticket.status === "rejected" ? "Reject Reason" : "Cancelled Reason"}
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{reasonData.reason}</p>
                        {reasonAt ? (
                          <p className="text-xs text-muted-foreground mt-2">
                            {ticket.status === "rejected" ? "Rejected on " : "Cancelled on "}
                            {format(new Date(reasonAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        ) : null}
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
