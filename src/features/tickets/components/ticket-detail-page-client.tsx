"use client"

import { useNavigate } from "react-router-dom"
import { ClipboardDocumentIcon, ShareIcon } from "@heroicons/react/24/outline"
import { PageLayout } from "@client/components/ui/page-layout"
import { EntityPageLayout } from "@client/components/ui/entity-page-layout"
import { Breadcrumb } from "@client/components/ui/breadcrumb"
import { Button } from "@client/components/ui/button"
import { useTicketDetailSurface } from "@client/features/tickets/hooks/use-ticket-detail-surface"
import { useTicketDetailSharing } from "@client/features/tickets/hooks/use-ticket-detail-sharing"
import { TicketDetailLayout } from "@client/features/tickets/components/ticket-detail-layout"

type TicketDetailPageClientProps = {
  ticketId: string
}

export function TicketDetailPageClient({ ticketId }: TicketDetailPageClientProps) {
  const navigate = useNavigate()
  const surface = useTicketDetailSurface(ticketId, { enabled: true })
  const { ticket } = surface
  const displayId = ticket?.displayId || ticketId.slice(0, 8)
  const { handleCopyTicketLabel, handleCopyShareUrl } = useTicketDetailSharing({
    ticket,
  })

  const breadcrumbItems = [
    { label: "Tickets", href: "/tickets" },
    { label: displayId },
  ]

  if (!ticketId) return null

  return (
    <PageLayout>
      <EntityPageLayout
        header={
          <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1 min-w-0">
              <div className="mb-1">
                <Breadcrumb items={breadcrumbItems} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {String(displayId).toUpperCase()}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCopyTicketLabel}
                aria-label="Copy ticket label"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCopyShareUrl}
                aria-label="Copy share URL"
              >
                <ShareIcon className="h-4 w-4" />
              </Button>
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
