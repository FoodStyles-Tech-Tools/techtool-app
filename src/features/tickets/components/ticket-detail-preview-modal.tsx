"use client"

import { ArrowTopRightOnSquareIcon, XMarkIcon } from "@heroicons/react/24/outline"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { Button } from "@client/components/ui/button"
import { useTicketDetailSurface } from "@client/features/tickets/hooks/use-ticket-detail-surface"
import { TicketDetailLayout } from "@client/features/tickets/components/ticket-detail-layout"

type TicketDetailPreviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string
  onExpand: () => void
}

function TicketDetailPreviewModalBody({
  ticketId,
  onClose,
}: {
  ticketId: string
  onClose: () => void
}) {
  const surface = useTicketDetailSurface(ticketId, { enabled: true })

  return (
    <TicketDetailLayout
      surface={surface}
      onBackToTickets={onClose}
      showHeader={true}
    />
  )
}

export function TicketDetailPreviewModal({
  open,
  onOpenChange,
  ticketId,
  onExpand,
}: TicketDetailPreviewModalProps) {
  const handleExpand = () => {
    onExpand()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[90vh] max-h-[90vh] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-border px-4 py-2">
          <DialogTitle className="sr-only">Ticket preview</DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExpand}
              className="gap-1.5"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Expand
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="gap-1.5"
            >
              <XMarkIcon className="h-4 w-4" />
              Close
            </Button>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {open && ticketId ? (
            <TicketDetailPreviewModalBody
              ticketId={ticketId}
              onClose={() => onOpenChange(false)}
            />
          ) : open ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading ticket…</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
