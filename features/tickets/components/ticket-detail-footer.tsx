"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Ticket } from "@/lib/types"

type TicketDetailFooterProps = {
  ticket: Ticket | null | undefined
  canEditTickets: boolean
  onRequestDelete: () => void
  onClose: () => void
}

export function TicketDetailFooter({
  ticket,
  canEditTickets,
  onRequestDelete,
  onClose,
}: TicketDetailFooterProps) {
  return (
    <>
      <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
        {ticket && canEditTickets ? (
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onRequestDelete}>
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete Ticket
          </Button>
        ) : null}
      </div>
      <Button type="button" variant="outline" onClick={onClose}>
        Close
      </Button>
    </>
  )
}
