import { requirePagePermission } from "@/lib/server/require-page-permission"
import ReportClient from "./report-client"

export default async function ReportPage() {
  await requirePagePermission("clockify", "view")
  return <ReportClient />
}
