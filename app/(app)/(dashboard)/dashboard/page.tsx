import { getDashboardData } from "@/lib/server/dashboard"
import { DashboardClient } from "./dashboard-client"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const { tickets, ticketsError, ticketStatuses, calendar } = await getDashboardData()

  return (
    <DashboardClient
      tickets={tickets}
      ticketsError={ticketsError}
      ticketStatuses={ticketStatuses}
      calendar={calendar}
    />
  )
}
