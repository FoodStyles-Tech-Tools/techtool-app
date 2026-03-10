"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { usePermissions } from "@/hooks/use-permissions"
import { useProjects } from "@/hooks/use-projects"
import { useDeleteEpic } from "@/hooks/use-epics"
import { EpicForm } from "@/components/forms/epic-form"

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

const nativeSelectClassName =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
const actionButtonClassName =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"

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

    const visibleProjects =
      projectFilter === "all" ? projects : projects.filter((project) => project.id === projectFilter)

    if (!visibleProjects.length) {
      setEpics([])
      return
    }

    setLoading(true)
    try {
      const epicResults = await Promise.all(
        visibleProjects.map(async (project) => {
          const res = await fetch(`/api/epics?project_id=${project.id}`)
          if (!res.ok) {
            const error = await res.json().catch(() => null)
            throw new Error(error?.error || `Failed to fetch epics for ${project.name}`)
          }
          const data = await res.json()
          const list = Array.isArray(data?.epics) ? data.epics : []
          return list.map((epic: any) => ({
            ...epic,
            project_name: project.name,
          })) as WorkspaceEpic[]
        })
      )

      const merged = epicResults
        .flat()
        .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())

      setEpics(merged)
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Epic</h3>
          <p className="text-sm text-slate-500">Epics are managed per project.</p>
        </div>
        <div className="flex items-end gap-2">
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
            Create Epic
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs uppercase tracking-wide text-slate-500">
          Each epic belongs to a single project.
        </div>
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
                      <button
                        type="button"
                        className={actionButtonClassName}
                        onClick={() => openEditDialog(epic)}
                        aria-label={`Edit ${epic.name}`}
                        title="Edit epic"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={actionButtonClassName}
                        onClick={() => setEpicToDelete(epic)}
                        disabled={deleteEpic.isPending}
                        aria-label={`Delete ${epic.name}`}
                        title="Delete epic"
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
    </div>
  )
}
