"use client"

import { useQuery } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"

export type TicketActivityItem = {
  id: string
  ticket_id: string
  actor_id: string | null
  event_type: string
  field_name: string | null
  old_value: unknown
  new_value: unknown
  metadata: Record<string, unknown> | null
  created_at: string
  actor: {
    id: string
    name: string | null
    email: string
    avatar_url?: string | null
  } | null
}

type TicketActivityResponse = {
  activities: TicketActivityItem[]
}

export function useTicketActivity(ticketId: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient()
  const enabled = !!ticketId && (options?.enabled !== false)

  useRealtimeSubscription({
    table: "ticket_activity",
    filter: `ticket_id=eq.${ticketId}`,
    enabled,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-activity", ticketId] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-activity", ticketId] })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-activity", ticketId] })
    },
  })

  return useQuery<TicketActivityResponse>({
    queryKey: ["ticket-activity", ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${ticketId}/activity`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to load activity" }))
        throw new Error(err.error || "Failed to load activity")
      }
      return res.json()
    },
    enabled,
    staleTime: 15 * 1000,
  })
}
