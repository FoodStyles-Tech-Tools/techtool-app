"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { TicketDetailFooter } from "@client/features/tickets/components/ticket-detail-footer"
import { useTicketDetailSurface } from "@client/features/tickets/hooks/use-ticket-detail-surface"
import { TicketDetailLayout } from "@client/features/tickets/components/ticket-detail-layout"
import type { TicketDetailDialogProps } from "@client/features/tickets/types"

export function TicketDetailDialog({ ticketId, open, onOpenChange }: TicketDetailDialogProps) {
  const surface = useTicketDetailSurface(ticketId || "", { enabled: !!ticketId && open })

  if (!ticketId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden border-0 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {surface.ticket
              ? `Ticket ${surface.ticket.displayId || ticketId.slice(0, 8)}: ${surface.ticket.title}`
              : `Ticket ${ticketId.slice(0, 8)}`}
          </DialogTitle>
          <DialogDescription>
            Ticket detail panel with description, relations, and activity.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <TicketDetailLayout
            surface={surface}
            onBackToTickets={() => onOpenChange(false)}
          />
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-card px-4 py-3 sm:justify-between">
          <TicketDetailFooter
            ticket={surface.ticket}
            canEditTickets={surface.canEditTickets}
            onRequestDelete={surface.actions.openDeleteDialog}
            onClose={() => onOpenChange(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
