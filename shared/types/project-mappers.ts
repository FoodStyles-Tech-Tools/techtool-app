import { sanitizeLinkArray } from "@shared/links"
import type { Project, ProjectCollaborator } from "./domain"
import type { ProjectDto } from "./api/projects"

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

/** Normalize an API ProjectDto to the domain Project type. */
export function normalizeProject(dto: ProjectDto): Project {
  const project = dto as unknown as Project
  return {
    ...project,
    links: sanitizeLinkArray(project.links),
    collaborator_ids: toArray<string>(project.collaborator_ids),
    collaborators: toArray<ProjectCollaborator>(project.collaborators),
    requester_ids: toArray<string>(project.requester_ids),
    requesters: toArray<ProjectCollaborator>(project.requesters),
  }
}
