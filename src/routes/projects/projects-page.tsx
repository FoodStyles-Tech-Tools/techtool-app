import { useDepartments } from "@/hooks/use-departments"
import { useProjects } from "@/hooks/use-projects"
import { useUsers } from "@/hooks/use-users"
import { FullScreenMessage } from "@/src/layouts/full-screen-message"
import ProjectsClient from "./projects-client"

export function ProjectsPage() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects({ realtime: false })
  const { departments, loading: departmentsLoading } = useDepartments({ realtime: false })
  const { data: users = [], isLoading: usersLoading } = useUsers({ realtime: false })

  if (projectsLoading || departmentsLoading || usersLoading) {
    return (
      <FullScreenMessage
        title="Loading projects"
        description="Fetching projects, departments, and people."
      />
    )
  }

  return (
    <ProjectsClient
      initialProjects={projects}
      initialDepartments={departments}
      initialUsers={users}
    />
  )
}
