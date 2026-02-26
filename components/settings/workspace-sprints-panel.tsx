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
import { useDeleteSprint } from "@/hooks/use-sprints"
import { SprintForm } from "@/components/forms/sprint-form"
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

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

  const projects = useMemo<WorkspaceProject[]>(
    () => (projectsData || []).map((project: any) => ({ id: project.id, name: project.name })),
    [projectsData]
  )

  const loadSprints = useCallback(async () => {
    if (!projects.length) {
      setSprints([])
      return
    }

    const visibleProjects =
      projectFilter === "all" ? projects : projects.filter((project) => project.id === projectFilter)

    if (!visibleProjects.length) {
      setSprints([])
      return
    }

    setLoading(true)
    try {
      const sprintResults = await Promise.all(
        visibleProjects.map(async (project) => {
          const res = await fetch(`/api/sprints?project_id=${project.id}`)
          if (!res.ok) {
            const error = await res.json().catch(() => null)
            throw new Error(error?.error || `Failed to fetch sprints for ${project.name}`)
          }
          const data = await res.json()
          const list = Array.isArray(data?.sprints) ? data.sprints : []
          return list.map((sprint: any) => ({
            ...sprint,
            project_name: project.name,
          })) as WorkspaceSprint[]
        })
      )

      const merged = sprintResults
        .flat()
        .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())

      setSprints(merged)
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
    const confirmed = confirm(`Delete sprint "${sprint.name}"?`)
    if (!confirmed) return

    try {
      await deleteSprint.mutateAsync(sprint.id)
      await loadSprints()
    } catch {
      // handled by mutation toast
    }
  }

  if (!canEditProjects) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Sprint</h3>
        <p className="text-sm text-muted-foreground">You do not have permission to manage sprints.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Sprint</h3>
          <p className="text-sm text-muted-foreground">Sprints are always specific to a project.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-[260px] space-y-1">
            <Label htmlFor="sprint-project-filter">Project</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger id="sprint-project-filter" className="h-9">
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
            Create Sprint
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          Sprints belong to one project and can optionally include dates.
        </div>
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
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Loading sprints...
                </TableCell>
              </TableRow>
            ) : sprints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No sprints found.
                </TableCell>
              </TableRow>
            ) : (
              sprints.map((sprint) => (
                <TableRow key={sprint.id}>
                  <TableCell className="font-medium">{sprint.name}</TableCell>
                  <TableCell>{sprint.project_name}</TableCell>
                  <TableCell className="capitalize">{sprint.status}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sprint.start_date || "-"} to {sprint.end_date || "-"}
                  </TableCell>
                  <TableCell>{sprint.updated_at ? new Date(sprint.updated_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md border border-transparent hover:border-border">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(sprint)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void handleDeleteSprint(sprint)}
                          disabled={deleteSprint.isPending}
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
              <Select value={targetProjectId} onValueChange={setTargetProjectId}>
                <SelectTrigger id="target-sprint-project">
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
            <p className="text-sm text-muted-foreground">Select a project to continue.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
