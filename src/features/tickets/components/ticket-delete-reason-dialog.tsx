"use client"

import { ReasonFormDialog } from "@client/features/tickets/components/reason-form-dialog"

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
    <ReasonFormDialog
      open={open}
      title="Archive Ticket"
      description="This will archive the ticket. Please provide a reason for archiving it."
      value={reason}
      onChange={onReasonChange}
      onCancel={onCancel}
      onConfirm={onConfirm}
      disabled={disabled}
      confirmLabel="Confirm Archive"
      destructive
      placeholder="Enter archive reason..."
    />
  )
}

