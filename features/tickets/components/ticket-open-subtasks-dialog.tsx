"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { TicketSubtaskRow } from "@/features/tickets/types"

export function TicketOpenSubtasksDialog({
  open,
  targetStatus,
  subtasks,
  onCancel,
  onKeepOpen,
  onCloseAll,
  title = "Open Subtasks Found",
  descriptionPrefix = "This ticket has open subtasks. Do you want to close them too when changing status to",
}: {
  open: boolean
  targetStatus: string | null
  subtasks: TicketSubtaskRow[]
  onCancel: () => void
  onKeepOpen: () => void
  onCloseAll: () => void
  title?: string
  descriptionPrefix?: string
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {descriptionPrefix} <strong>{targetStatus?.replace(/_/g, " ")}</strong>?
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-56 space-y-2 overflow-y-auto py-1">
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="rounded border px-2.5 py-1.5 text-sm">
              <span className="font-mono text-xs text-muted-foreground">
                {(subtask.display_id || subtask.id.slice(0, 8)).toUpperCase()}
              </span>{" "}
              {subtask.title}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onKeepOpen}>
            Keep Subtasks Open
          </Button>
          <Button onClick={onCloseAll}>Close All Subtasks</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
