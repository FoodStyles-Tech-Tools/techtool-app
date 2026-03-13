"use client"

import { TicketOpenSubtasksDialog } from "@client/features/tickets/components/ticket-open-subtasks-dialog"
import { TicketArchiveDialog } from "@client/features/tickets/components/ticket-archive-dialog"
import type { TicketSubtaskRow } from "@client/features/tickets/types"

type TicketDetailDialogsProps = {
  openSubtasksDialog: {
    targetStatus: string
    subtasks: TicketSubtaskRow[]
  } | null
  onSubtasksCancel: () => void
  onSubtasksKeepOpen: () => void
  onSubtasksCloseAll: () => void
  isDeleteDialogOpen: boolean
  onDeleteCancel: () => void
  onDeleteConfirm: () => void
}

export function TicketDetailDialogs({
  openSubtasksDialog,
  onSubtasksCancel,
  onSubtasksKeepOpen,
  onSubtasksCloseAll,
  isDeleteDialogOpen,
  onDeleteCancel,
  onDeleteConfirm,
}: TicketDetailDialogsProps) {
  return (
    <>
      <TicketOpenSubtasksDialog
        open={!!openSubtasksDialog}
        targetStatus={openSubtasksDialog?.targetStatus || null}
        subtasks={openSubtasksDialog?.subtasks || []}
        onCancel={onSubtasksCancel}
        onKeepOpen={onSubtasksKeepOpen}
        onCloseAll={onSubtasksCloseAll}
      />
      <TicketArchiveDialog
        open={isDeleteDialogOpen}
        onCancel={onDeleteCancel}
        onConfirm={onDeleteConfirm}
      />
    </>
  )
}
