"use client"

import { Link } from "react-router-dom"
import { useDeferredValue, useMemo, useState } from "react"
import { ProjectForm } from "@/components/forms/project-form"
import { usePermissions } from "@/hooks/use-permissions"
import { toast } from "@/components/ui/toast"

const ROWS_PER_PAGE = 20

type Department = { id: string; name: string }
type BasicUser = {
  id: string
  name: string | null
  email: string
  image: string | null
  role?: string | null
}
type ProjectRowData = {
  id: string
  name: string
  description: string | null
  status: "active" | "inactive"
  require_sqa: boolean
  created_at: string
  department: Department | null
  owner?: BasicUser | null
  requesters: BasicUser[]
  requester_ids?: string[]
  collaborators: BasicUser[]
  collaborator_ids?: string[]
  links?: string[] | null
}

type ProjectsClientProps = {
  initialProjects: ProjectRowData[]
  initialDepartments: Department[]
  initialUsers: BasicUser[]
}

export default function ProjectsClient({
  initialProjects,
  initialDepartments,
  initialUsers,
}: ProjectsClientProps) {
  const { flags, user: currentUser } = usePermissions()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active")
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isProjectFormOpen, setProjectFormOpen] = useState(false)
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const users = useMemo(
    () =>
      (initialUsers || []).filter((user) =>
        user.role ? ["admin", "member"].includes(user.role.toLowerCase()) : false
      ),
    [initialUsers]
  )

  const filteredProjects = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase()
    const currentUserId = currentUser?.id

    return initialProjects
      .filter((project) => {
        if (statusFilter === "active" && project.status !== "active") return false
        if (
          normalizedQuery &&
          !project.name.toLowerCase().includes(normalizedQuery) &&
          !project.description?.toLowerCase().includes(normalizedQuery)
        ) {
          return false
        }

        if (assignedToMeOnly && currentUserId) {
          const isOwner = project.owner?.id === currentUserId
          const isRequester = project.requesters.some((requester) => requester.id === currentUserId)
          const isCollaborator = project.collaborators.some((collaborator) => collaborator.id === currentUserId)
          if (!isOwner && !isRequester && !isCollaborator) return false
        }

        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  }, [currentUser?.id, deferredSearchQuery, initialProjects, assignedToMeOnly, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ROWS_PER_PAGE))
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex)
  const canCreateProjects = flags?.canCreateProjects ?? false
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Projects</h1>
            <p className="text-sm text-slate-500">
              Projects organize ticket work. Open a project to review ownership and jump into its queue.
            </p>
          </div>
          {canCreateProjects ? (
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
              onClick={() => setProjectFormOpen(true)}
            >
              Create Project
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-2 whitespace-nowrap py-1">
          <div className="w-full min-w-[220px] md:w-72">
            <input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setCurrentPage(1)
              }}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as "active" | "all")
              setCurrentPage(1)
            }}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
          >
            <option value="active">Active only</option>
            <option value="all">All projects</option>
          </select>
          <label className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={assignedToMeOnly}
              onChange={(event) => {
                setAssignedToMeOnly(event.target.checked)
                setCurrentPage(1)
              }}
              className="h-4 w-4 rounded border-slate-300"
            />
            Assigned to me
          </label>
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setSearchQuery("")
              setStatusFilter("active")
              setAssignedToMeOnly(false)
              setCurrentPage(1)
            }}
          >
            Reset
          </button>
          </div>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-sm font-medium text-slate-900">No projects found</h2>
          <p className="mt-1 text-sm text-slate-500">
            Try changing the current filters or create a project.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="h-9 px-3 py-2 text-xs font-medium text-slate-500">Project Name</th>
                  <th className="h-9 px-3 py-2 text-xs font-medium text-slate-500">Project Owner</th>
                  <th className="h-9 px-3 py-2 text-xs font-medium text-slate-500">Collaborators</th>
                  <th className="h-9 px-3 py-2 text-xs font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProjects.map((project) => {
                  const ownerLabel = project.owner?.name || project.owner?.email || "Unassigned"
                  const collaboratorLabel =
                    project.collaborators.length > 0
                      ? project.collaborators
                          .map((collaborator) => collaborator.name || collaborator.email)
                          .join(", ")
                      : "-"
                  return (
                    <tr key={project.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-sm">
                        <Link
                          to={`/projects/${project.id}`}
                          className="font-medium text-slate-900 hover:underline"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-700">{ownerLabel}</td>
                      <td className="px-3 py-2 text-sm text-slate-700">{collaboratorLabel}</td>
                      <td className="px-3 py-2 text-sm capitalize text-slate-700">{project.status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <div className="text-sm text-slate-500">
              Showing {filteredProjects.length === 0 ? 0 : startIndex + 1} to{" "}
              {Math.min(endIndex, filteredProjects.length)} of {filteredProjects.length} projects
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {isProjectFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Create Project</h2>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-900"
                onClick={() => setProjectFormOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <ProjectForm
                departments={initialDepartments}
                users={users}
                formId="create-project-form"
                hideSubmitButton
                onSuccess={() => {
                  setProjectFormOpen(false)
                  toast("Project created")
                  window.location.reload()
                }}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setProjectFormOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-project-form"
                className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
