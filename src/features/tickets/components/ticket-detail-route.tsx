import { useLoaderData } from "react-router-dom"
import { FullScreenMessage } from "@client/layouts/full-screen-message"
import { TicketDetailPageClient } from "./ticket-detail-page-client"

export function TicketDetailRoute() {
  const { ticketId } = useLoaderData() as { ticketId: string | null }

  if (!ticketId) {
    return (
      <FullScreenMessage
        title="Ticket not found"
        description="The requested ticket could not be resolved."
      />
    )
  }

  return <TicketDetailPageClient ticketId={ticketId} />
}
