import { requirePagePermission } from "@/lib/server/require-page-permission"
import ClockifyClient from "./clockify-client"

export default async function ClockifyPage() {
  await requirePagePermission("clockify", "view")
  return <ClockifyClient />
}
