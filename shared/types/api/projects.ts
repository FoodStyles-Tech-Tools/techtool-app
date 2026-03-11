export type ProjectOwnerDto = {
  id: string
  name: string | null
  email: string
  image: string | null
} | null

export type ProjectDepartmentDto = {
  id: string
  name: string
} | null

export type ProjectDto = {
  id: string
  name: string
  description: string | null
  status: string
  require_sqa: boolean
  links: string[]
  created_at: string
  owner_id: string | null
  collaborator_ids: string[]
  requester_ids: string[]
  department_id?: string | null
  owner: ProjectOwnerDto
  department: ProjectDepartmentDto
  collaborators: Array<{ id: string; name: string | null; email: string; image: string | null }>
  requesters: Array<{ id: string; name: string | null; email: string; image: string | null }>
}

export type ProjectsResponseDto = {
  projects: ProjectDto[]
  count?: number
}
