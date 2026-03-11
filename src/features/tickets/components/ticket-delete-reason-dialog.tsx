"use client"

import { Button } from "@client/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { Textarea } from "@client/components/ui/textarea"

export function TicketDeleteReasonDialog({
  open,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  disabled = false,
}: {
  open: boolean
  reason: string
  onReasonChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  disabled?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Ticket</DialogTitle>
          <DialogDescription>
            This will archive the ticket. Please provide a reason for deleting it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Enter delete reason..."
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault()
                void onConfirm()
              }
            }}
            rows={4}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()} disabled={disabled}>
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
