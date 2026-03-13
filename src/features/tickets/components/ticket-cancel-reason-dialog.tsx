"use client"

import { ReasonFormDialog } from "@client/features/tickets/components/reason-form-dialog"

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
    <ReasonFormDialog
      open={open}
      title={isRejected ? "Reject Ticket" : "Cancel Ticket"}
      description={`Please provide a reason for ${isRejected ? "rejecting" : "cancelling"} this ticket.`}
      value={reason}
      onChange={onReasonChange}
      onCancel={onCancel}
      onConfirm={onConfirm}
      onShortcutSubmit={onShortcutSubmit}
      disabled={disabled}
      confirmLabel={isRejected ? "Confirm Rejection" : "Confirm Cancellation"}
      placeholder={isRejected ? "Enter reject reason..." : "Enter cancellation reason..."}
    />
  )
}

