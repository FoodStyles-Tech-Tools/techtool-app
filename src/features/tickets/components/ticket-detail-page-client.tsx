"use client"

import { useNavigate } from "react-router-dom"
import { PageLayout } from "@client/components/ui/page-layout"
import { EntityPageLayout } from "@client/components/ui/entity-page-layout"
import { Button } from "@client/components/ui/button"
import { Input } from "@client/components/ui/input"
import { TicketStatusSelect } from "@client/components/ticket-status-select"
import { useTicketDetailSurface } from "@client/features/tickets/hooks/use-ticket-detail-surface"
import { TicketDetailLayout } from "@client/features/tickets/components/ticket-detail-layout"

type TicketDetailPageClientProps = {
  ticketId: string
}

export function TicketDetailPageClient({ ticketId }: TicketDetailPageClientProps) {
  const navigate = useNavigate()
  const surface = useTicketDetailSurface(ticketId, { enabled: true })
  const { ticket, canEditTickets, isAssignmentLocked, actions, parentNavigationSlug, handleGoToParentTicket } = surface
  const displayId = ticket?.displayId || ticketId.slice(0, 8)

  if (!ticketId) return null

  return (
    <PageLayout>
      <EntityPageLayout
        header={
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              {actions.isEditingTitle ? (
                <Input
                  value={actions.titleValue}
                  onChange={(e) => actions.setTitleValue(e.target.value)}
                  onBlur={() => void actions.handleTitleSave()}
                  onKeyDown={actions.handleTitleKeyDown}
                  className="h-11 text-2xl font-semibold"
                  disabled={!canEditTickets}
                  autoFocus
                />
              ) : (
                <h1
                  className={[
                    "text-2xl font-semibold text-slate-900",
                    canEditTickets ? "cursor-pointer rounded-md px-1 py-1 hover:bg-slate-50" : "",
                  ].join(" ")}
                  onClick={() => {
                    if (canEditTickets) actions.setIsEditingTitle(true)
                  }}
                >
                  {ticket?.title || "Untitled ticket"}
                </h1>
              )}
              <p className="font-mono text-sm text-slate-500">{displayId}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => navigate("/tickets")}>
                Back to Tickets
              </Button>
              {parentNavigationSlug ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoToParentTicket}
                >
                  Parent Ticket
                </Button>
              ) : null}
              {ticket ? (
                <TicketStatusSelect
                  value={ticket.status}
                  onValueChange={(status) => void actions.handleStatusChange(status)}
                  disabled={!canEditTickets || isAssignmentLocked || !!actions.updatingFields.status}
                  allowSqaStatuses={ticket.project?.require_sqa === true}
                  triggerClassName="h-9 text-sm"
                />
              ) : null}
              <details className="relative">
                <summary className="list-none [&::-webkit-details-marker]:hidden">
                  <Button type="button" variant="outline" size="sm">
                    Actions
                  </Button>
                </summary>
                <div className="absolute right-0 z-40 mt-2 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-md">
                  <button
                    type="button"
                    onClick={actions.handleCopyTicketLabel}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100"
                  >
                    Copy ticket info
                  </button>
                  <button
                    type="button"
                    onClick={actions.handleCopyShareUrl}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100"
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={actions.handleCopyHyperlinkedUrl}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100"
                  >
                    Copy rich link
                  </button>
                  {ticket && canEditTickets ? (
                    <button
                      type="button"
                      onClick={actions.openDeleteDialog}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete ticket
                    </button>
                  ) : null}
                </div>
              </details>
            </div>
          </div>
        }
      >
        <TicketDetailLayout
          surface={surface}
          onBackToTickets={() => navigate("/tickets")}
          showHeader={false}
        />
      </EntityPageLayout>
    </PageLayout>
  )
}
