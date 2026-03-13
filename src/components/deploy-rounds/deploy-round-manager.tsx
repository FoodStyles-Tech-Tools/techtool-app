"use client"

import { useState } from "react"
import { PencilIcon, TrashIcon } from "@heroicons/react/20/solid"
import { Button } from "@client/components/ui/button"
import { Checkbox } from "@client/components/ui/checkbox"
import { toast } from "@client/components/ui/toast"
import { DeployRoundFormDialog } from "./deploy-round-form-dialog"
import { ConfirmDialog } from "@client/components/ui/confirm-dialog"
import type { DeployRoundChecklistItem } from "@shared/types"
import type { DeployRoundWithMeta } from "@client/features/projects/lib/deploy-rounds-client"

interface DeployRoundManagerProps {
  deployRound: DeployRoundWithMeta
  onUpdate: (deployRoundId: string, data: { name?: string; checklist?: DeployRoundChecklistItem[] }) => Promise<void>
  onDelete: (deployRoundId: string) => Promise<void>
}

export function DeployRoundManager({ deployRound, onUpdate, onDelete }: DeployRoundManagerProps) {
  const [isEditOpen, setEditOpen] = useState(false)
  const [isDeleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalChecklistItems = deployRound.checklist.length
  const completedChecklistItems = deployRound.checklist.filter((item) => item.completed).length
  const checklistProgress = totalChecklistItems > 0 ? (completedChecklistItems / totalChecklistItems) * 100 : 0

  const handleUpdate = async (values: { name: string; checklist: DeployRoundChecklistItem[] }) => {
    try {
      await onUpdate(deployRound.id, values)
      toast("Deploy round updated successfully")
    } catch (error: any) {
      console.error("Error updating deploy round:", error)
      toast(error?.message || "Failed to update deploy round", "error")
      throw error
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await onDelete(deployRound.id)
      toast("Deploy round deleted successfully")
      setDeleteOpen(false)
    } catch (error: any) {
      console.error("Error deleting deploy round:", error)
      const message = error?.message || "Failed to delete deploy round"
      toast(message, "error")
    } finally {
      setIsDeleting(false)
    }
  }

  const canDelete = !deployRound.hasTickets

  return (
    <>
      <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{deployRound.name}</h3>

          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex h-5 items-center rounded-full border border-border px-2 text-[11px] font-medium">
                  {completedChecklistItems}/{totalChecklistItems || 0} completed
                </span>
                <span className="text-[11px]">
                  {totalChecklistItems} checklist item{totalChecklistItems !== 1 ? "s" : ""}
                  {deployRound.hasTickets && " • Has linked tickets"}
                </span>
              </div>
              {totalChecklistItems > 0 && (
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
              )}
            </div>

            {totalChecklistItems > 0 && (
              <ul className="mt-1 space-y-1.5 text-xs text-muted-foreground">
                {deployRound.checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={item.completed}
                      disabled
                      className="h-3.5 w-3.5 rounded-[4px] border-border data-[state=checked]:bg-emerald-500 data-[state=checked]:text-emerald-50"
                    />
                    <span className={item.completed ? "line-through text-muted-foreground/80" : ""}>{item.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="h-8 w-8 p-0"
            title="Edit deploy round"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            disabled={!canDelete}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
            title={canDelete ? "Delete deploy round" : "Cannot delete - tickets are linked"}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DeployRoundFormDialog
        open={isEditOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleUpdate}
        initialData={deployRound}
        title="Edit Deploy Round"
        submitLabel="Save Changes"
      />

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Deploy Round"
        description={`Are you sure you want to delete "${deployRound.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={isDeleting}
      />
    </>
  )
}
