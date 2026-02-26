import { requirePagePermission } from "@/lib/server/require-page-permission"
import { WorkspaceStatusPanel } from "@/components/settings/workspace-status-panel"

export default async function WorkspaceStatusPage() {
  await requirePagePermission("status", "manage")
  return <WorkspaceStatusPanel />
}
