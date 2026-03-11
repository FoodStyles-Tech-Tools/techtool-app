"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@client/components/ui/button"
import type { Ticket } from "@shared/types"

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
          <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={onRequestDelete}>
            <Trash2 className="h-4 w-4" />
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
