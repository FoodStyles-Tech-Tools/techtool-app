import { PageLoader } from "@client/layouts/full-screen-message"
import { useDepartments } from "@client/hooks/use-departments"
import { useProjects } from "@client/hooks/use-projects"
import { useUsers } from "@client/hooks/use-users"
import ProjectsClient from "./projects-client"

export function ProjectsPage() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects({ realtime: false })
  const { departments, loading: departmentsLoading } = useDepartments({ realtime: false })
  const { data: users = [], isLoading: usersLoading } = useUsers({ realtime: false })

  if (projectsLoading || departmentsLoading || usersLoading) {
    return <PageLoader />
  }

  return (
    <ProjectsClient
      initialProjects={projects}
      initialDepartments={departments}
      initialUsers={users}
    />
  )
}
