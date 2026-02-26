import { requirePagePermission } from "@/lib/server/require-page-permission"
import { WorkspaceEpicsPanel } from "@/components/settings/workspace-epics-panel"

export default async function WorkspaceEpicPage() {
  await requirePagePermission("projects", "edit")
  return <WorkspaceEpicsPanel />
}
