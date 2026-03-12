"use client"

import { useNavigate } from "react-router-dom"
import { PageLayout } from "@client/components/ui/page-layout"
import { EntityPageLayout } from "@client/components/ui/entity-page-layout"
import { Breadcrumb } from "@client/components/ui/breadcrumb"
import { useTicketDetailSurface } from "@client/features/tickets/hooks/use-ticket-detail-surface"
import { TicketDetailLayout } from "@client/features/tickets/components/ticket-detail-layout"

type TicketDetailPageClientProps = {
  ticketId: string
}

export function TicketDetailPageClient({ ticketId }: TicketDetailPageClientProps) {
  const navigate = useNavigate()
  const surface = useTicketDetailSurface(ticketId, { enabled: true })
  const { ticket, parentNavigationSlug, selectedParentTicketOption } = surface
  const displayId = ticket?.displayId || ticketId.slice(0, 8)
  const parentLabel = selectedParentTicketOption
    ? (selectedParentTicketOption.displayId || selectedParentTicketOption.id.slice(0, 8)).toUpperCase()
    : null

  const breadcrumbItems = [
    { label: "Tickets", href: "/tickets" },
    ...(parentNavigationSlug && parentLabel
      ? [{ label: parentLabel, href: `/tickets/${parentNavigationSlug}` as string }]
      : []),
    { label: displayId },
  ]

  if (!ticketId) return null

  return (
    <PageLayout>
      <EntityPageLayout
        header={
          <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1 min-w-0">
              <div className="mb-1">
                <Breadcrumb items={breadcrumbItems} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2" />
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
