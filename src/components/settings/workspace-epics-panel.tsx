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
import { useDeleteEpic } from "@client/hooks/use-epics"
import { EpicForm } from "@client/components/forms/epic-form"
import { inputClassName } from "@client/lib/form-styles"

type WorkspaceProject = {
  id: string
  name: string
}

type WorkspaceEpic = {
  id: string
  name: string
  description: string | null
  color: string
  project_id: string
  sprint_id: string | null
  created_at: string
  updated_at: string
  project_name: string
}

const nativeSelectClassName = inputClassName

export function WorkspaceEpicsPanel() {
  const { flags } = usePermissions()
  const canEditProjects = flags?.canEditProjects ?? false
  const { data: projectsData } = useProjects({ realtime: false, enabled: canEditProjects })
  const deleteEpic = useDeleteEpic()
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [epics, setEpics] = useState<WorkspaceEpic[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEpic, setEditingEpic] = useState<WorkspaceEpic | null>(null)
  const [targetProjectId, setTargetProjectId] = useState<string>("")
  const [epicToDelete, setEpicToDelete] = useState<WorkspaceEpic | null>(null)

  const projects = useMemo<WorkspaceProject[]>(
    () => (projectsData || []).map((project: any) => ({ id: project.id, name: project.name })),
    [projectsData]
  )

  const loadEpics = useCallback(async () => {
    if (!projects.length) {
      setEpics([])
      return
    }
    const projectNameById = new Map(projects.map((project) => [project.id, project.name]))

    setLoading(true)
    try {
      const query =
        projectFilter === "all"
          ? ""
          : `?project_id=${encodeURIComponent(projectFilter)}`
      const res = await fetch(`/api/epics${query}`)
      if (!res.ok) {
        const error = await res.json().catch(() => null)
        throw new Error(error?.error || "Failed to fetch epics")
      }
      const data = await res.json()
      const list = Array.isArray(data?.epics) ? data.epics : []
      const merged = list
        .map((epic: any) => ({
          ...epic,
          project_name: projectNameById.get(epic.project_id) || "Unknown Project",
        }))
        .sort((a: WorkspaceEpic, b: WorkspaceEpic) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
        )

      setEpics(merged as WorkspaceEpic[])
    } catch (error: any) {
      toast(error.message || "Failed to load epics", "error")
      setEpics([])
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
    void loadEpics()
  }, [loadEpics])

  const openCreateDialog = () => {
    const preferredProject = projectFilter !== "all" ? projectFilter : projects[0]?.id
    if (!preferredProject) {
      toast("Create a project first before adding epics.", "error")
      return
    }
    setEditingEpic(null)
    setTargetProjectId(preferredProject)
    setDialogOpen(true)
  }

  const openEditDialog = (epic: WorkspaceEpic) => {
    setEditingEpic(epic)
    setTargetProjectId(epic.project_id)
    setDialogOpen(true)
  }

  const handleDeleteEpic = async (epic: WorkspaceEpic) => {
    try {
      await deleteEpic.mutateAsync(epic.id)
      await loadEpics()
    } catch {
      // handled by mutation toast
    } finally {
      setEpicToDelete(null)
    }
  }

  if (!canEditProjects) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Epic</h3>
        <p className="text-sm text-slate-500">You do not have permission to manage epics.</p>
      </div>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Epics"
        description="Epics are managed per project."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-[260px] space-y-1">
              <Label htmlFor="epic-project-filter">Project</Label>
              <select
                id="epic-project-filter"
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
              Create Epic
            </Button>
          </div>
        }
      />

      <EntityTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Epic</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                  Loading epics...
                </TableCell>
              </TableRow>
            ) : epics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                  No epics found.
                </TableCell>
              </TableRow>
            ) : (
              epics.map((epic) => (
                <TableRow key={epic.id}>
                  <TableCell className="font-medium">{epic.name}</TableCell>
                  <TableCell>{epic.project_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{epic.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>{epic.updated_at ? new Date(epic.updated_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => openEditDialog(epic)}
                        aria-label={`Edit ${epic.name}`}
                        title="Edit epic"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => setEpicToDelete(epic)}
                        disabled={deleteEpic.isPending}
                        aria-label={`Delete ${epic.name}`}
                        title="Delete epic"
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
            setEditingEpic(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEpic ? "Edit Epic" : "Create Epic"}</DialogTitle>
          </DialogHeader>

          {!editingEpic ? (
            <div className="space-y-2">
              <Label htmlFor="target-epic-project">Project</Label>
              <select
                id="target-epic-project"
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
            <EpicForm
              projectId={targetProjectId}
              initialData={
                editingEpic
                  ? {
                      id: editingEpic.id,
                      name: editingEpic.name,
                      description: editingEpic.description ?? undefined,
                      color: editingEpic.color,
                      sprint_id: editingEpic.sprint_id ?? "",
                    }
                  : undefined
              }
              onSuccess={() => {
                setDialogOpen(false)
                setEditingEpic(null)
                void loadEpics()
              }}
            />
          ) : (
            <p className="text-sm text-slate-500">Select a project to continue.</p>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!epicToDelete}
        onOpenChange={(open) => !open && setEpicToDelete(null)}
        title="Delete epic?"
        description={`This will remove ${epicToDelete?.name || "the selected epic"} and move attached tickets to No Epic.`}
        confirmLabel="Delete"
        destructive
        confirming={deleteEpic.isPending}
        onConfirm={() => {
          if (epicToDelete) {
            void handleDeleteEpic(epicToDelete)
          }
        }}
      />
    </PageLayout>
  )
}
