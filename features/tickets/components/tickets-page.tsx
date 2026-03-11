import { useSearchParams } from "react-router-dom"
import TicketsClient from "./tickets-client"

export function TicketsPage() {
  const [searchParams] = useSearchParams()
  return <TicketsClient initialProjectId={searchParams.get("projectId")} />
}
