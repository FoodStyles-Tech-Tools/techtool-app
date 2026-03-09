import { redirect } from "next/navigation"
import { requirePagePermission } from "@/lib/server/require-page-permission"

interface ProjectDetailPageProps {
  params: {
    projectId: string
  }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  await requirePagePermission("projects", "view")
  redirect(`/tickets?projectId=${encodeURIComponent(params.projectId)}`)
}
