"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { usePermissions } from "@/hooks/use-permissions"
import { useProjects } from "@/hooks/use-projects"
import { useDeleteEpic } from "@/hooks/use-epics"
import { EpicForm } from "@/components/forms/epic-form"
import { Circle, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

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
    const confirmed = confirm(`Delete epic "${epic.name}"? Tickets in this epic will move to "No Epic".`)
    if (!confirmed) return

    try {
      await deleteEpic.mutateAsync(epic.id)
      await loadEpics()
    } catch {
      // handled by mutation toast
    }
  }

  if (!canEditProjects) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Epic</h3>
        <p className="text-sm text-muted-foreground">You do not have permission to manage epics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Epic</h3>
          <p className="text-sm text-muted-foreground">Epics are managed per project.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-[260px] space-y-1">
            <Label htmlFor="epic-project-filter">Project</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger id="epic-project-filter" className="h-9">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create Epic
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
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
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Loading epics...
                </TableCell>
              </TableRow>
            ) : epics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
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
                      <Circle className="h-3 w-3" style={{ fill: epic.color, color: epic.color }} />
                      <span className="font-mono text-xs">{epic.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>{epic.updated_at ? new Date(epic.updated_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md border border-transparent hover:border-border">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(epic)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void handleDeleteEpic(epic)}
                          disabled={deleteEpic.isPending}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
              <Select value={targetProjectId} onValueChange={setTargetProjectId}>
                <SelectTrigger id="target-epic-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <p className="text-sm text-muted-foreground">Select a project to continue.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
