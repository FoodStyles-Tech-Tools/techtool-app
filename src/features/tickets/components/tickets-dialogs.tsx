"use client"

import { lazyComponent } from "@client/lib/lazy-component"
import { TicketOpenSubtasksDialog } from "@client/features/tickets/components/ticket-open-subtasks-dialog"
import type { TicketSubtaskRow } from "@client/features/tickets/types"

const TicketDetailDialog = lazyComponent(
  () => import("@client/features/tickets/components/ticket-detail-dialog").then((mod) => mod.TicketDetailDialog),
)
const GlobalTicketDialog = lazyComponent(
  () => import("@client/components/global-ticket-dialog").then((mod) => mod.GlobalTicketDialog),
)

type TicketsDialogsProps = {
  canCreateTickets: boolean
  isTicketDialogOpen: boolean
  setTicketDialogOpen: (open: boolean) => void
  selectedTicketId: string | null
  setSelectedTicketId: (ticketId: string | null) => void
  showOpenSubtasksDialog: boolean
  openSubtasksTargetStatus: string | null
  openSubtasks: TicketSubtaskRow[]
  onOpenSubtasksCancel: () => void
  onOpenSubtasksKeepOpen: () => void
  onOpenSubtasksCloseAll: () => void
}

export function TicketsDialogs({
  canCreateTickets,
  isTicketDialogOpen,
  setTicketDialogOpen,
  selectedTicketId,
  setSelectedTicketId,
  showOpenSubtasksDialog,
  openSubtasksTargetStatus,
  openSubtasks,
  onOpenSubtasksCancel,
  onOpenSubtasksKeepOpen,
  onOpenSubtasksCloseAll,
}: TicketsDialogsProps) {
  return (
    <>
      <GlobalTicketDialog open={isTicketDialogOpen && canCreateTickets} onOpenChange={setTicketDialogOpen} />
      <TicketDetailDialog
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicketId(null)
          }
        }}
      />
      <TicketOpenSubtasksDialog
        open={showOpenSubtasksDialog}
        targetStatus={openSubtasksTargetStatus}
        subtasks={openSubtasks}
        onCancel={onOpenSubtasksCancel}
        onKeepOpen={onOpenSubtasksKeepOpen}
        onCloseAll={onOpenSubtasksCloseAll}
      />
    </>
  )
}


