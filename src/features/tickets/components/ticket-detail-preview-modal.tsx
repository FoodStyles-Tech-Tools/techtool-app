"use client"

import {
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  ShareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { Button } from "@client/components/ui/button"
import { useTicketDetailSurface } from "@client/features/tickets/hooks/use-ticket-detail-surface"
import { useTicketDetailSharing } from "@client/features/tickets/hooks/use-ticket-detail-sharing"
import { TicketDetailLayout } from "@client/features/tickets/components/ticket-detail-layout"

type TicketDetailPreviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string
  onExpand: () => void
}

function TicketDetailPreviewModalBody({
  surface,
  onClose,
}: {
  surface: ReturnType<typeof useTicketDetailSurface>
  onClose: () => void
}) {
  return (
    <TicketDetailLayout
      surface={surface}
      onBackToTickets={onClose}
      showHeader={false}
    />
  )
}

export function TicketDetailPreviewModal({
  open,
  onOpenChange,
  ticketId,
  onExpand,
}: TicketDetailPreviewModalProps) {
  const surface = useTicketDetailSurface(ticketId, { enabled: true })
  const { handleCopyTicketLabel, handleCopyShareUrl } = useTicketDetailSharing({
    ticket: surface.ticket,
  })

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
              variant="ghost"
              size="icon"
              onClick={handleCopyTicketLabel}
              aria-label="Copy ticket label"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCopyShareUrl}
              aria-label="Copy share URL"
            >
              <ShareIcon className="h-4 w-4" />
            </Button>
          </div>
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
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {open && ticketId ? (
            <TicketDetailPreviewModalBody
              surface={surface}
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
