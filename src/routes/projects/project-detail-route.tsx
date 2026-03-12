import { useLoaderData, useParams } from "react-router-dom"
import { FullScreenMessage } from "@client/layouts/full-screen-message"
import type { Project } from "@shared/types"
import ProjectDetailClient from "./project-detail-client"

export function ProjectDetailRoute() {
  const { projectId } = useParams()
  const { project } = useLoaderData() as { project: Project | null }

  if (!projectId) {
    return (
      <FullScreenMessage
        title="Project not found"
        description="The requested project identifier is missing."
      />
    )
  }

  if (!project) {
    return (
      <FullScreenMessage
        title="Project not found"
        description="The requested project could not be loaded."
      />
    )
  }

  return (
    <ProjectDetailClient projectId={projectId} initialProject={{ project }} />
  )
}
