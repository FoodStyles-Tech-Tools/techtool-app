import { requirePagePermission } from "@/lib/server/require-page-permission"
import { getTicketStatuses } from "@/lib/server/statuses"
import StatusClient from "./status-client"

export default async function StatusPage() {
  await requirePagePermission("status", "manage")
  const statuses = await getTicketStatuses()
  return <StatusClient initialStatuses={statuses} />
}
