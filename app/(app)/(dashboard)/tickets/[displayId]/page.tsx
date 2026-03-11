import { notFound } from "@/src/compat/router"
import { requirePagePermission } from "@/lib/server/require-page-permission"
import { createServerClient } from "@/lib/supabase"
import { TicketDetailPageClient } from "@/features/tickets/components/ticket-detail-page-client"

interface TicketByDisplayIdPageProps {
  params: {
    displayId: string
  }
}

export default async function TicketByDisplayIdPage({ params }: TicketByDisplayIdPageProps) {
  await requirePagePermission("tickets", "view")

  const supabase = createServerClient()
  const normalizedDisplayId = params.displayId.toUpperCase()
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id")
    .eq("display_id", normalizedDisplayId)
    .maybeSingle()

  if (error) {
    console.error("Error resolving ticket by display ID:", error)
    notFound()
  }

  if (!ticket?.id) {
    notFound()
  }

  return <TicketDetailPageClient ticketId={ticket.id} />
}


