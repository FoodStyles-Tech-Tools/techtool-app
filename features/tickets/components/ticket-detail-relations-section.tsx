"use client"

import { format } from "date-fns"
import type { Ticket, TicketDetailRelations } from "@/lib/types"

const fieldLabelClassName =
  "w-[6.5rem] flex-shrink-0 pt-2 text-xs font-medium uppercase tracking-wide text-slate-500"

type TicketDetailRelationsSectionProps = {
  ticket: Ticket
  relations: TicketDetailRelations
}

export function TicketDetailRelationsSection({
  ticket,
  relations,
}: TicketDetailRelationsSectionProps) {
  const mentionedInComments = relations.mentionedInComments ?? []

  return (
    <>
      <div className="flex items-start gap-3">
        <label className={fieldLabelClassName}>Relations</label>
        <div className="min-w-0 flex-1 space-y-1.5">
          {relations.parent ? (
            <a
              href={`/tickets/${String(relations.parent.displayId || relations.parent.id).toLowerCase()}`}
              className="flex items-center justify-between rounded-md border border-slate-200 px-2.5 py-1.5 text-sm hover:bg-slate-50"
            >
              <span className="truncate">
                Parent: {(relations.parent.displayId || relations.parent.id.slice(0, 8)).toUpperCase()} • {relations.parent.title}
              </span>
              <span className="ml-2 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Open</span>
            </a>
          ) : null}
          {mentionedInComments.map((mention) => {
            const mentionCount = mention.mentionedInCommentIds?.length ?? 0
            return (
              <a
                key={mention.ticket.id}
                href={`/tickets/${String(mention.ticket.displayId || mention.ticket.id).toLowerCase()}`}
                className="flex items-center justify-between rounded-md border border-slate-200 px-2.5 py-1.5 text-sm hover:bg-slate-50"
              >
                <span className="truncate">
                  Mentioned in {mentionCount} comment{mentionCount === 1 ? "" : "s"} on {(mention.ticket.displayId || mention.ticket.id.slice(0, 8)).toUpperCase()} • {mention.ticket.title}
                </span>
                <span className="ml-2 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Open</span>
              </a>
            )
          })}
          {!relations.parent && mentionedInComments.length === 0 ? (
            <p className="text-xs text-slate-500">No relations yet.</p>
          ) : null}
        </div>
      </div>

      {(ticket.status === "cancelled" || ticket.status === "rejected") &&
      (ticket.reason?.cancelled || ticket.reason?.rejected) ? (
        <div className="flex items-start gap-3">
          <label className={fieldLabelClassName}>Reason</label>
          <div className="min-w-0 flex-1">
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">Warning</span>
                <div className="min-w-0 flex-1">
                  {(() => {
                    const reasonData =
                      ticket.status === "rejected" ? ticket.reason?.rejected : ticket.reason?.cancelled
                    if (!reasonData) return null
                    const reasonAt =
                      "rejectedAt" in reasonData ? reasonData.rejectedAt : reasonData.cancelledAt
                    return (
                      <>
                        <p className="mb-1 text-sm font-medium text-slate-900">
                          {ticket.status === "rejected" ? "Reject reason" : "Cancelled reason"}
                        </p>
                        <p className="whitespace-pre-wrap break-words text-sm text-slate-900">
                          {reasonData.reason}
                        </p>
                        {reasonAt ? (
                          <p className="mt-2 text-xs text-slate-500">
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
