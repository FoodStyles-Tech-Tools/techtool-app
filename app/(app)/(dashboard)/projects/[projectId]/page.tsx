import { requirePagePermission } from "@/lib/server/require-page-permission"
import ProjectDetailClient from "./project-detail-client"

export default async function ProjectDetailPage() {
  await requirePagePermission("projects", "view")
  return <ProjectDetailClient />
}
