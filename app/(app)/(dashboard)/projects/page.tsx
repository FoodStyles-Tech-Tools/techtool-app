import { requirePagePermission } from "@/lib/server/require-page-permission"
import { getProjectsPageData } from "@/lib/server/projects"
import ProjectsClient from "./projects-client"

export default async function ProjectsPage() {
  await requirePagePermission("projects", "view")
  const { projects, departments, users, ticketStats } = await getProjectsPageData()
  return (
    <ProjectsClient
      initialProjects={projects}
      initialDepartments={departments}
      initialUsers={users}
      initialTicketStats={ticketStats}
    />
  )
}
