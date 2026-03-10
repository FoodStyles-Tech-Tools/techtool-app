import { requirePagePermission } from "@/lib/server/require-page-permission"
import ProjectDetailClient from "./project-detail-client"

interface ProjectDetailPageProps {
  params: {
    projectId: string
  }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  await requirePagePermission("projects", "view")
  return <ProjectDetailClient projectId={params.projectId} />
}
