import { requirePagePermission } from "@/lib/server/require-page-permission"
import { DeletedTicketsPanel } from "@/components/settings/deleted-tickets-panel"

export default async function DeletedTicketsPage() {
  await requirePagePermission("tickets", "view")
  return <DeletedTicketsPanel />
}

