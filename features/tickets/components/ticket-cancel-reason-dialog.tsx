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
import { Textarea } from "@/components/ui/textarea"

export function TicketCancelReasonDialog({
  open,
  status,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  onShortcutSubmit,
  disabled = false,
}: {
  open: boolean
  status: "cancelled" | "rejected" | null
  reason: string
  onReasonChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  onShortcutSubmit?: () => void | Promise<void>
  disabled?: boolean
}) {
  const isRejected = status === "rejected"

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isRejected ? "Reject Ticket" : "Cancel Ticket"}</DialogTitle>
          <DialogDescription>
            Please provide a reason for {isRejected ? "rejecting" : "cancelling"} this ticket.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            placeholder={isRejected ? "Enter reject reason..." : "Enter cancellation reason..."}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            onKeyDown={(event) => {
              if (onShortcutSubmit && (event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault()
                void onShortcutSubmit()
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
          <Button onClick={() => void onConfirm()} disabled={disabled}>
            {isRejected ? "Confirm Rejection" : "Confirm Cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
