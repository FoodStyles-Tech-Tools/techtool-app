import { requirePagePermission } from "@/lib/server/require-page-permission"
import TicketsClient from "@/features/tickets/components/tickets-client"

interface TicketsPageProps {
  searchParams?: {
    projectId?: string | string[] | null
  }
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  await requirePagePermission("tickets", "view")

  const rawProjectId = searchParams?.projectId
  const initialProjectId =
    typeof rawProjectId === "string" ? rawProjectId : Array.isArray(rawProjectId) ? rawProjectId[0] : null

  return <TicketsClient initialProjectId={initialProjectId} />
}
