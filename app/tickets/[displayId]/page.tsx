"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TicketDetailDialog } from "@/components/ticket-detail-dialog"
import { toast } from "@/components/ui/toast"
import { Skeleton } from "@/components/ui/skeleton"

export default function TicketByDisplayIdPage() {
  const params = useParams()
  const router = useRouter()
  const displayId = params.displayId as string
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTicketByDisplayId() {
      if (!displayId) return

      try {
        setIsLoading(true)
        const response = await fetch(`/api/tickets/by-display-id/${displayId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Ticket not found")
            toast("Ticket not found", "error")
            // Redirect to tickets page after a delay
            setTimeout(() => {
              router.push("/tickets")
            }, 2000)
          } else {
            setError("Failed to load ticket")
            toast("Failed to load ticket", "error")
            setTimeout(() => {
              router.push("/tickets")
            }, 2000)
          }
          return
        }

        const data = await response.json()
        if (data.ticket) {
          setTicketId(data.ticket.id)
        }
      } catch (err) {
        console.error("Error fetching ticket:", err)
        setError("Failed to load ticket")
        toast("Failed to load ticket", "error")
        setTimeout(() => {
          router.push("/tickets")
        }, 2000)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTicketByDisplayId()
  }, [displayId, router])

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // When dialog closes, redirect to tickets page
      router.replace("/tickets")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 w-full max-w-md p-6">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground">
            Redirecting to tickets page...
          </p>
        </div>
      </div>
    )
  }

  if (!ticketId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">Ticket not found</p>
          <p className="text-sm text-muted-foreground">
            Redirecting to tickets page...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <TicketDetailDialog
        ticketId={ticketId}
        open={true}
        onOpenChange={handleDialogClose}
      />
    </div>
  )
}
