import { requirePagePermission } from "@/lib/server/require-page-permission"
import GuildLeadReportClient from "../guild-lead-report-client"

export default async function GuildLeadReportPage() {
  await requirePagePermission("clockify", "view")
  return <GuildLeadReportClient />
}
