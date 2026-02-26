import { requirePagePermission } from "@/lib/server/require-page-permission"
import { WorkspaceSprintsPanel } from "@/components/settings/workspace-sprints-panel"

export default async function WorkspaceSprintPage() {
  await requirePagePermission("projects", "edit")
  return <WorkspaceSprintsPanel />
}
