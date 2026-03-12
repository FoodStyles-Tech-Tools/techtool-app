"use client"

import { useMemo, useState } from "react"
import { PlusIcon } from "@heroicons/react/20/solid"
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
import { toast } from "@client/components/ui/toast"
import { usePermissions } from "@client/hooks/use-permissions"
import { useDeleteEpic, useEpics } from "@client/hooks/use-epics"
import { EpicForm } from "@client/components/forms/epic-form"

type WorkspaceEpic = {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
}

export function WorkspaceEpicsPanel() {
  const { flags } = usePermissions()
  const canEditProjects = flags?.canEditProjects ?? false
  const { epics, loading } = useEpics()
  const deleteEpic = useDeleteEpic()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEpic, setEditingEpic] = useState<WorkspaceEpic | null>(null)
  const [epicToDelete, setEpicToDelete] = useState<WorkspaceEpic | null>(null)

  const sortedEpics = useMemo(
    () =>
      [...epics].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      ),
    [epics]
  )

  const handleDeleteEpic = async (epic: WorkspaceEpic) => {
    try {
      await deleteEpic.mutateAsync(epic.id)
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
        <p className="text-sm text-muted-foreground">You do not have permission to manage epics.</p>
      </div>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Epics"
        description="Epics can be used across all projects."
        actions={
          <Button type="button" size="sm" variant="outline" onClick={() => { setEditingEpic(null); setDialogOpen(true) }}>
            <PlusIcon className="h-4 w-4" />
            Create Epic
          </Button>
        }
      />

      <EntityTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Epic</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Loading epics...
                </TableCell>
              </TableRow>
            ) : sortedEpics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No epics found.
                </TableCell>
              </TableRow>
            ) : (
              sortedEpics.map((epic) => (
                <TableRow key={epic.id}>
                  <TableCell className="font-medium">{epic.name}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{epic.color}</span>
                  </TableCell>
                  <TableCell>{epic.updated_at ? new Date(epic.updated_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => { setEditingEpic(epic); setDialogOpen(true) }}
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
          if (!open) setEditingEpic(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEpic ? "Edit Epic" : "Create Epic"}</DialogTitle>
          </DialogHeader>
          <EpicForm
            initialData={
              editingEpic
                ? {
                    id: editingEpic.id,
                    name: editingEpic.name,
                    description: editingEpic.description ?? undefined,
                    color: editingEpic.color,
                  }
                : undefined
            }
            onSuccess={() => {
              setDialogOpen(false)
              setEditingEpic(null)
            }}
          />
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
          if (epicToDelete) void handleDeleteEpic(epicToDelete)
        }}
      />
    </PageLayout>
  )
}
