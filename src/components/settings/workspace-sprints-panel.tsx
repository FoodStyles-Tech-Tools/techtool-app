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
import { usePermissions } from "@client/hooks/use-permissions"
import { useDeleteSprint, useSprints } from "@client/hooks/use-sprints"
import { SprintForm } from "@client/components/forms/sprint-form"

export function WorkspaceSprintsPanel() {
  const { flags } = usePermissions()
  const canEditProjects = flags?.canEditProjects ?? false
  const { sprints, loading } = useSprints()
  const deleteSprint = useDeleteSprint()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSprint, setEditingSprint] = useState<(typeof sprints)[0] | null>(null)
  const [sprintToDelete, setSprintToDelete] = useState<(typeof sprints)[0] | null>(null)

  const sortedSprints = useMemo(
    () =>
      [...sprints].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      ),
    [sprints]
  )

  const handleDeleteSprint = async (sprint: (typeof sprints)[0]) => {
    try {
      await deleteSprint.mutateAsync(sprint.id)
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
        <p className="text-sm text-muted-foreground">You do not have permission to manage sprints.</p>
      </div>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Sprints"
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingSprint(null)
              setDialogOpen(true)
            }}
          >
            <PlusIcon className="h-4 w-4" />
            Create Sprint
          </Button>
        }
      />

      <EntityTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sprint</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8" />
              </TableRow>
            ) : sortedSprints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No sprints found.
                </TableCell>
              </TableRow>
            ) : (
              sortedSprints.map((sprint) => (
                <TableRow key={sprint.id}>
                  <TableCell className="font-medium">{sprint.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sprint.start_date || "-"} to {sprint.end_date || "-"}
                  </TableCell>
                  <TableCell>
                    {sprint.updated_at
                      ? new Date(sprint.updated_at).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                          setEditingSprint(sprint)
                          setDialogOpen(true)
                        }}
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
          if (!open) setEditingSprint(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSprint ? "Edit Sprint" : "Create Sprint"}</DialogTitle>
          </DialogHeader>
          <SprintForm
                  initialData={
              editingSprint
                ? {
                    id: editingSprint.id,
                    name: editingSprint.name,
                    description: editingSprint.description ?? undefined,
                    start_date: editingSprint.start_date ?? undefined,
                    end_date: editingSprint.end_date ?? undefined,
                  }
                : undefined
            }
            onSuccess={() => {
              setDialogOpen(false)
              setEditingSprint(null)
            }}
          />
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
          if (sprintToDelete) void handleDeleteSprint(sprintToDelete)
        }}
      />
    </PageLayout>
  )
}
