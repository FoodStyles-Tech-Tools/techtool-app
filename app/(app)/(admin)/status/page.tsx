import { requirePagePermission } from "@/lib/server/require-page-permission"
import StatusClient from "./status-client"

export default async function StatusPage() {
  await requirePagePermission("status", "manage")
  return <StatusClient />
}
