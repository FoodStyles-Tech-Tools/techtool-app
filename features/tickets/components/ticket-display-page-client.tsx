"use client"

import { useRouter } from "@/src/compat/router"
import { TicketDetailDialog } from "@/features/tickets/components/ticket-detail-dialog"

export function TicketDisplayPageClient({ ticketId }: { ticketId: string }) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <TicketDetailDialog
        ticketId={ticketId}
        open
        onOpenChange={(open) => {
          if (!open) {
            router.replace("/tickets")
          }
        }}
      />
    </div>
  )
}


