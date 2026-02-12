import { requirePagePermission } from "@/lib/server/require-page-permission"
import TicketsClient from "./tickets-client"

export default async function TicketsPage() {
  await requirePagePermission("tickets", "view")
  return <TicketsClient />
}
