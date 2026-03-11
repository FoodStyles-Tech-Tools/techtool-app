import { useParams } from "react-router-dom"
import { FullScreenMessage } from "@client/layouts/full-screen-message"
import ProjectDetailClient from "./project-detail-client"

export function ProjectDetailRoute() {
  const { projectId } = useParams()

  if (!projectId) {
    return (
      <FullScreenMessage
        title="Project not found"
        description="The requested project identifier is missing."
      />
    )
  }

  return <ProjectDetailClient projectId={projectId} />
}
