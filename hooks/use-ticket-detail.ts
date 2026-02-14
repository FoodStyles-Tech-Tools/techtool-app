"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import type { Ticket } from "@/lib/types"
import type { TicketComment } from "./use-ticket-comments"

interface TicketDetailResponse {
  ticket: Ticket
  comments: TicketComment[]
}

export function useTicketDetail(ticketId: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient()
  const enabled = !!ticketId && (options?.enabled !== false)

  useRealtimeSubscription({
    table: "tickets",
    filter: `id=eq.${ticketId}`,
    enabled,
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-detail", ticketId] })
    },
  })

  const query = useQuery<TicketDetailResponse>({
    queryKey: ["ticket-detail", ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${ticketId}/detail`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to load ticket detail")
      }
      return res.json()
    },
    enabled,
    staleTime: 60 * 1000,
  })

  const ticket = query.data?.ticket ?? null
  const comments = query.data?.comments ?? []

  return {
    ticket,
    comments,
    isLoading: query.isLoading,
    isPending: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}
