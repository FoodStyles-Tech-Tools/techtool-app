import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { requestJson } from "@client/lib/api"
import { FullScreenMessage } from "@client/layouts/full-screen-message"
import { TicketDetailPageClient } from "./ticket-detail-page-client"

export function TicketDetailRoute() {
  const { displayId } = useParams()
  const ticketLookup = useQuery({
    queryKey: ["ticket-display-id", displayId],
    enabled: !!displayId,
    queryFn: async () => {
      const response = await requestJson<{ ticket: { id: string } }>(
        `/api/tickets/by-display-id/${encodeURIComponent(displayId || "")}`
      )
      return response.ticket
    },
  })

  if (ticketLookup.isLoading) {
    return (
      <FullScreenMessage
        title="Loading ticket"
        description="Resolving the ticket identifier and fetching details."
      />
    )
  }

  if (!ticketLookup.data?.id) {
    return (
      <FullScreenMessage
        title="Ticket not found"
        description="The requested ticket could not be resolved."
      />
    )
  }

  return <TicketDetailPageClient ticketId={ticketLookup.data.id} />
}
