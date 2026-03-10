"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "@/hooks/use-realtime"
import { fetchTicketDetail } from "@/features/tickets/lib/client"
import { ticketQueryKeys } from "@/features/tickets/lib/query-keys"
import type { Ticket, TicketDetailRelations } from "@/lib/types"
import type { TicketComment } from "@/hooks/use-ticket-comments"

interface TicketDetailResponse {
  ticket: Ticket
  comments: TicketComment[]
  relations?: TicketDetailRelations
}

export function useTicketDetail(ticketId: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient()
  const enabled = !!ticketId && (options?.enabled !== false)

  useRealtimeSubscription({
    table: "tickets",
    filter: `id=eq.${ticketId}`,
    enabled,
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ticketQueryKeys.detail(ticketId) })
    },
  })

  const query = useQuery<TicketDetailResponse>({
    queryKey: ticketQueryKeys.detail(ticketId),
    queryFn: () => fetchTicketDetail(ticketId),
    enabled,
    staleTime: 60 * 1000,
  })

  const ticket = query.data?.ticket ?? null
  const comments = query.data?.comments ?? []
  const relations = query.data?.relations ?? {
    parent: null,
    subtasks: [],
    mentioned_in_comments: [],
    mentionedInComments: [],
  }

  return {
    ticket,
    comments,
    relations,
    isLoading: query.isLoading,
    isPending: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}
