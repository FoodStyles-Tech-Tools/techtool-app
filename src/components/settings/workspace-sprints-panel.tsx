"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@client/components/ui/button"
import { PageLayout } from "@client/components/ui/page-layout"
import { PageHeader } from "@client/components/ui/page-header"
import { EntityTableShell } from "@client/components/ui/entity-table-shell"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { ConfirmDialog } from "@client/components/ui/confirm-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table"
import { Label } from "@client/components/ui/label"
import { toast } from "@client/components/ui/toast"
import { usePermissions } from "@client/hooks/use-permissions"
import { useProjects } from "@client/hooks/use-projects"
import { useDeleteSprint } from "@client/hooks/use-sprints"
import { SprintForm } from "@client/components/forms/sprint-form"
import { inputClassName } from "@client/lib/form-styles"

type WorkspaceProject = {
  id: string
  name: string
}

type WorkspaceSprint = {
  id: string
  name: string
  description: string | null
  project_id: string
  status: "planned" | "active" | "completed" | "cancelled"
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
  project_name: string
}

const nativeSelectClassName = inputClassName

export function WorkspaceSprintsPanel() {
  const { flags } = usePermissions()
  const canEditProjects = flags?.canEditProjects ?? false
  const { data: projectsData } = useProjects({ realtime: false, enabled: canEditProjects })
  const deleteSprint = useDeleteSprint()
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [sprints, setSprints] = useState<WorkspaceSprint[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSprint, setEditingSprint] = useState<WorkspaceSprint | null>(null)
  const [targetProjectId, setTargetProjectId] = useState<string>("")
  const [sprintToDelete, setSprintToDelete] = useState<WorkspaceSprint | null>(null)

  const projects = useMemo<WorkspaceProject[]>(
    () => (projectsData || []).map((project: any) => ({ id: project.id, name: project.name })),
    [projectsData]
  )

  const loadSprints = useCallback(async () => {
    if (!projects.length) {
      setSprints([])
      return
    }
    const projectNameById = new Map(projects.map((project) => [project.id, project.name]))

    setLoading(true)
    try {
      const query =
        projectFilter === "all"
          ? ""
          : `?project_id=${encodeURIComponent(projectFilter)}`
      const res = await fetch(`/api/sprints${query}`)
      if (!res.ok) {
        const error = await res.json().catch(() => null)
        throw new Error(error?.error || "Failed to fetch sprints")
      }
      const data = await res.json()
      const list = Array.isArray(data?.sprints) ? data.sprints : []
      const merged = list
        .map((sprint: any) => ({
          ...sprint,
          project_name: projectNameById.get(sprint.project_id) || "Unknown Project",
        }))
        .sort((a: WorkspaceSprint, b: WorkspaceSprint) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
        )

      setSprints(merged as WorkspaceSprint[])
    } catch (error: any) {
      toast(error.message || "Failed to load sprints", "error")
      setSprints([])
    } finally {
      setLoading(false)
    }
  }, [projectFilter, projects])

  useEffect(() => {
    if (!targetProjectId && projects.length > 0) {
      setTargetProjectId(projects[0].id)
    }
  }, [projects, targetProjectId])

  useEffect(() => {
    void loadSprints()
  }, [loadSprints])

  const openCreateDialog = () => {
    const preferredProject = projectFilter !== "all" ? projectFilter : projects[0]?.id
    if (!preferredProject) {
      toast("Create a project first before adding sprints.", "error")
      return
    }
    setEditingSprint(null)
    setTargetProjectId(preferredProject)
    setDialogOpen(true)
  }

  const openEditDialog = (sprint: WorkspaceSprint) => {
    setEditingSprint(sprint)
    setTargetProjectId(sprint.project_id)
    setDialogOpen(true)
  }

  const handleDeleteSprint = async (sprint: WorkspaceSprint) => {
    try {
      await deleteSprint.mutateAsync(sprint.id)
      await loadSprints()
    } catch {
      // handled by mutation toast
    } finally {
      setSprintToDelete(null)
    }
  }

  if (!canEditProjects) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Sprint</h3>
        <p className="text-sm text-slate-500">You do not have permission to manage sprints.</p>
      </div>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Sprints"
        description="Sprints are always specific to a project."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-[260px] space-y-1">
              <Label htmlFor="sprint-project-filter">Project</Label>
              <select
                id="sprint-project-filter"
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className={nativeSelectClassName}
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Create Sprint
            </Button>
          </div>
        }
      />

      <EntityTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sprint</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8" />
              </TableRow>
            ) : sprints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-500">
                  No sprints found.
                </TableCell>
              </TableRow>
            ) : (
              sprints.map((sprint) => (
                <TableRow key={sprint.id}>
                  <TableCell className="font-medium">{sprint.name}</TableCell>
                  <TableCell>{sprint.project_name}</TableCell>
                  <TableCell className="capitalize">{sprint.status}</TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {sprint.start_date || "-"} to {sprint.end_date || "-"}
                  </TableCell>
                  <TableCell>{sprint.updated_at ? new Date(sprint.updated_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => openEditDialog(sprint)}
                        aria-label={`Edit ${sprint.name}`}
                        title="Edit sprint"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => setSprintToDelete(sprint)}
                        disabled={deleteSprint.isPending}
                        aria-label={`Delete ${sprint.name}`}
                        title="Delete sprint"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </EntityTableShell>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingSprint(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSprint ? "Edit Sprint" : "Create Sprint"}</DialogTitle>
          </DialogHeader>

          {!editingSprint ? (
            <div className="space-y-2">
              <Label htmlFor="target-sprint-project">Project</Label>
              <select
                id="target-sprint-project"
                value={targetProjectId}
                onChange={(event) => setTargetProjectId(event.target.value)}
                className={nativeSelectClassName}
              >
                <option value="" disabled>
                  Select project
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {targetProjectId ? (
            <SprintForm
              projectId={targetProjectId}
              initialData={
                editingSprint
                  ? {
                      id: editingSprint.id,
                      name: editingSprint.name,
                      description: editingSprint.description ?? undefined,
                      status: editingSprint.status,
                      start_date: editingSprint.start_date ?? undefined,
                      end_date: editingSprint.end_date ?? undefined,
                    }
                  : undefined
              }
              onSuccess={() => {
                setDialogOpen(false)
                setEditingSprint(null)
                void loadSprints()
              }}
            />
          ) : (
            <p className="text-sm text-slate-500">Select a project to continue.</p>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!sprintToDelete}
        onOpenChange={(open) => !open && setSprintToDelete(null)}
        title="Delete sprint?"
        description={`This will permanently remove ${sprintToDelete?.name || "the selected sprint"}.`}
        confirmLabel="Delete"
        destructive
        confirming={deleteSprint.isPending}
        onConfirm={() => {
          if (sprintToDelete) {
            void handleDeleteSprint(sprintToDelete)
          }
        }}
      />
    </PageLayout>
  )
}
