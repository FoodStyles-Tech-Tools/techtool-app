"use client"

import { TicketCancelReasonDialog } from "@client/features/tickets/components/ticket-cancel-reason-dialog"
import { TicketDeleteReasonDialog } from "@client/features/tickets/components/ticket-delete-reason-dialog"
import { TicketOpenSubtasksDialog } from "@client/features/tickets/components/ticket-open-subtasks-dialog"
import { TicketReturnedReasonDialog } from "@client/features/tickets/components/ticket-returned-reason-dialog"
import type { TicketSubtaskRow } from "@client/features/tickets/types"

type TicketDetailDialogsProps = {
  canEditTickets: boolean
  showCancelReasonDialog: boolean
  pendingStatusChange: string | null
  cancelReason: string
  onCancelReasonChange: (value: string) => void
  onCancelReasonClose: () => void
  onCancelReasonConfirm: () => void
  showDeleteReasonDialog: boolean
  deleteReason: string
  onDeleteReasonChange: (value: string) => void
  onDeleteReasonClose: () => void
  onDeleteReasonConfirm: () => void
  showReturnedReasonDialog: boolean
  returnedReason: string
  onReturnedReasonChange: (value: string) => void
  onReturnedReasonClose: () => void
  onReturnedReasonConfirm: () => void
  openSubtasksDialog: {
    targetStatus: string
    subtasks: TicketSubtaskRow[]
  } | null
  onSubtasksCancel: () => void
  onSubtasksKeepOpen: () => void
  onSubtasksCloseAll: () => void
}

export function TicketDetailDialogs({
  canEditTickets,
  showCancelReasonDialog,
  pendingStatusChange,
  cancelReason,
  onCancelReasonChange,
  onCancelReasonClose,
  onCancelReasonConfirm,
  showDeleteReasonDialog,
  deleteReason,
  onDeleteReasonChange,
  onDeleteReasonClose,
  onDeleteReasonConfirm,
  showReturnedReasonDialog,
  returnedReason,
  onReturnedReasonChange,
  onReturnedReasonClose,
  onReturnedReasonConfirm,
  openSubtasksDialog,
  onSubtasksCancel,
  onSubtasksKeepOpen,
  onSubtasksCloseAll,
}: TicketDetailDialogsProps) {
  return (
    <>
      <TicketCancelReasonDialog
        open={showCancelReasonDialog}
        status={pendingStatusChange === "cancelled" || pendingStatusChange === "rejected" ? pendingStatusChange : null}
        reason={cancelReason}
        onReasonChange={onCancelReasonChange}
        onCancel={onCancelReasonClose}
        onConfirm={onCancelReasonConfirm}
        onShortcutSubmit={onCancelReasonConfirm}
        disabled={!canEditTickets}
      />
      <TicketDeleteReasonDialog
        open={showDeleteReasonDialog}
        reason={deleteReason}
        onReasonChange={onDeleteReasonChange}
        onCancel={onDeleteReasonClose}
        onConfirm={onDeleteReasonConfirm}
        disabled={!canEditTickets}
      />
      <TicketReturnedReasonDialog
        open={showReturnedReasonDialog}
        reason={returnedReason}
        onReasonChange={onReturnedReasonChange}
        onCancel={onReturnedReasonClose}
        onConfirm={onReturnedReasonConfirm}
        onShortcutSubmit={onReturnedReasonConfirm}
        disabled={!canEditTickets}
      />
      <TicketOpenSubtasksDialog
        open={!!openSubtasksDialog}
        targetStatus={openSubtasksDialog?.targetStatus || null}
        subtasks={openSubtasksDialog?.subtasks || []}
        onCancel={onSubtasksCancel}
        onKeepOpen={onSubtasksKeepOpen}
        onCloseAll={onSubtasksCloseAll}
      />
    </>
  )
}
