"use client"

import { lazyComponent } from "@/lib/lazy-component"
import { TicketCancelReasonDialog } from "@/features/tickets/components/ticket-cancel-reason-dialog"
import { TicketOpenSubtasksDialog } from "@/features/tickets/components/ticket-open-subtasks-dialog"
import { TicketReturnedReasonDialog } from "@/features/tickets/components/ticket-returned-reason-dialog"
import type { TicketSubtaskRow } from "@/features/tickets/types"

const TicketDetailDialog = lazyComponent(
  () => import("@/features/tickets/components/ticket-detail-dialog").then((mod) => mod.TicketDetailDialog),
)
const GlobalTicketDialog = lazyComponent(
  () => import("@/components/global-ticket-dialog").then((mod) => mod.GlobalTicketDialog),
)

type TicketsDialogsProps = {
  canCreateTickets: boolean
  isTicketDialogOpen: boolean
  setTicketDialogOpen: (open: boolean) => void
  selectedTicketId: string | null
  setSelectedTicketId: (ticketId: string | null) => void
  showCancelReasonDialog: boolean
  pendingStatusKind: "cancelled" | "rejected" | null
  cancelReason: string
  setCancelReason: (value: string) => void
  onCancelReasonCancel: () => void
  onCancelReasonConfirm: () => void | Promise<void>
  showOpenSubtasksDialog: boolean
  openSubtasksTargetStatus: string | null
  openSubtasks: TicketSubtaskRow[]
  onOpenSubtasksCancel: () => void
  onOpenSubtasksKeepOpen: () => void
  onOpenSubtasksCloseAll: () => void
  showReturnedReasonDialog: boolean
  returnedReason: string
  setReturnedReason: (value: string) => void
  onReturnedReasonCancel: () => void
  onReturnedReasonConfirm: () => void | Promise<void>
}

export function TicketsDialogs({
  canCreateTickets,
  isTicketDialogOpen,
  setTicketDialogOpen,
  selectedTicketId,
  setSelectedTicketId,
  showCancelReasonDialog,
  pendingStatusKind,
  cancelReason,
  setCancelReason,
  onCancelReasonCancel,
  onCancelReasonConfirm,
  showOpenSubtasksDialog,
  openSubtasksTargetStatus,
  openSubtasks,
  onOpenSubtasksCancel,
  onOpenSubtasksKeepOpen,
  onOpenSubtasksCloseAll,
  showReturnedReasonDialog,
  returnedReason,
  setReturnedReason,
  onReturnedReasonCancel,
  onReturnedReasonConfirm,
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
      <TicketCancelReasonDialog
        open={showCancelReasonDialog}
        status={pendingStatusKind}
        reason={cancelReason}
        onReasonChange={setCancelReason}
        onCancel={onCancelReasonCancel}
        onConfirm={onCancelReasonConfirm}
        onShortcutSubmit={onCancelReasonConfirm}
      />
      <TicketOpenSubtasksDialog
        open={showOpenSubtasksDialog}
        targetStatus={openSubtasksTargetStatus}
        subtasks={openSubtasks}
        onCancel={onOpenSubtasksCancel}
        onKeepOpen={onOpenSubtasksKeepOpen}
        onCloseAll={onOpenSubtasksCloseAll}
      />
      <TicketReturnedReasonDialog
        open={showReturnedReasonDialog}
        reason={returnedReason}
        onReasonChange={setReturnedReason}
        description="Add the reason before moving this ticket to Returned to Dev."
        placeholder="Explain what should be fixed before QA can continue..."
        onCancel={onReturnedReasonCancel}
        onConfirm={onReturnedReasonConfirm}
        onShortcutSubmit={onReturnedReasonConfirm}
      />
    </>
  )
}


