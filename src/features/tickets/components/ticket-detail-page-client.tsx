"use client"

import { useNavigate } from "react-router-dom"
import { PageLayout } from "@client/components/ui/page-layout"
import { useTicketDetailSurface } from "@client/features/tickets/hooks/use-ticket-detail-surface"
import { TicketDetailLayout } from "@client/features/tickets/components/ticket-detail-layout"

type TicketDetailPageClientProps = {
  ticketId: string
}

export function TicketDetailPageClient({ ticketId }: TicketDetailPageClientProps) {
  const navigate = useNavigate()
  const surface = useTicketDetailSurface(ticketId, { enabled: true })

  if (!ticketId) return null

  return (
    <PageLayout>
      <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col gap-4">
        <TicketDetailLayout
          surface={surface}
          onBackToTickets={() => navigate("/tickets")}
        />
      </div>
    </PageLayout>
  )
}
