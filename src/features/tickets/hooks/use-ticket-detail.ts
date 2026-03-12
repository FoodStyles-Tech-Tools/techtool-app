"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "@client/hooks/use-realtime"
import { fetchTicketDetail, normalizeTicket } from "@client/features/tickets/lib/client"
import { ticketQueryKeys } from "@client/features/tickets/lib/query-keys"
import type { Ticket, TicketDetailRelations } from "@shared/types"
import type { TicketComment } from "@client/hooks/use-ticket-comments"

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
    onUpdate: (payload) => {
      const partial = (payload.new as Partial<Ticket> | null) ?? null
      if (partial) {
        queryClient.setQueryData<TicketDetailResponse>(ticketQueryKeys.detail(ticketId), (current) => {
          if (!current?.ticket) return current
          return {
            ...current,
            ticket: normalizeTicket({
              ...current.ticket,
              ...partial,
            } as Ticket),
          }
        })
      }
      queryClient.invalidateQueries({
        queryKey: ticketQueryKeys.detail(ticketId),
        refetchType: "none",
      })
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
