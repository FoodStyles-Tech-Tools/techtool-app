"use client"

import { useNavigate } from "react-router-dom"
import { TicketDetailDialog } from "@/features/tickets/components/ticket-detail-dialog"

export function TicketDisplayPageClient({ ticketId }: { ticketId: string }) {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <TicketDetailDialog
        ticketId={ticketId}
        open
        onOpenChange={(open) => {
          if (!open) {
            navigate("/tickets", { replace: true })
          }
        }}
      />
    </div>
  )
}


