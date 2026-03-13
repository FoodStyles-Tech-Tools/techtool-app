"use client"

import { TicketOpenSubtasksDialog } from "@client/features/tickets/components/ticket-open-subtasks-dialog"
import type { TicketSubtaskRow } from "@client/features/tickets/types"

type TicketDetailDialogsProps = {
  openSubtasksDialog: {
    targetStatus: string
    subtasks: TicketSubtaskRow[]
  } | null
  onSubtasksCancel: () => void
  onSubtasksKeepOpen: () => void
  onSubtasksCloseAll: () => void
}

export function TicketDetailDialogs({
  openSubtasksDialog,
  onSubtasksCancel,
  onSubtasksKeepOpen,
  onSubtasksCloseAll,
}: TicketDetailDialogsProps) {
  return (
    <TicketOpenSubtasksDialog
      open={!!openSubtasksDialog}
      targetStatus={openSubtasksDialog?.targetStatus || null}
      subtasks={openSubtasksDialog?.subtasks || []}
      onCancel={onSubtasksCancel}
      onKeepOpen={onSubtasksKeepOpen}
      onCloseAll={onSubtasksCloseAll}
    />
  )
}
