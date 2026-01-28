"use client"

import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSupabaseClient } from "@/lib/supabase-client"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"
import { useRealtimeSubscription } from "./use-realtime"
import {
  DEFAULT_TICKET_STATUSES,
  sortTicketStatuses,
  type TicketStatus,
} from "@/lib/ticket-statuses"

type UseTicketStatusesOptions = {
  fallback?: boolean
}

export function useTicketStatuses(options?: UseTicketStatusesOptions) {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  useRealtimeSubscription({
    table: "ticket_statuses",
    enabled: true,
    onInsert: (payload) => {
      const newStatus = payload.new as TicketStatus
      queryClient.setQueryData<TicketStatus[]>(["ticket-statuses"], (old) => {
        if (!old) return old
        if (!old.some((status) => status.key === newStatus.key)) {
          return sortTicketStatuses([...old, newStatus])
        }
        return old
      })
    },
    onUpdate: (payload) => {
      const updatedStatus = payload.new as TicketStatus
      queryClient.setQueryData<TicketStatus[]>(["ticket-statuses"], (old) => {
        if (!old) return old
        const next = old.map((status) =>
          status.key === updatedStatus.key ? updatedStatus : status
        )
        return sortTicketStatuses(next)
      })
    },
    onDelete: (payload) => {
      const deletedKey = (payload.old as { key: string }).key
      queryClient.setQueryData<TicketStatus[]>(["ticket-statuses"], (old) => {
        if (!old) return old
        return old.filter((status) => status.key !== deletedKey)
      })
    },
  })

  const { data, isLoading, refetch, error } = useQuery<TicketStatus[]>({
    queryKey: ["ticket-statuses"],
    queryFn: async () => {
      await ensureUserContext(supabase, userEmail)

      const { data: statuses, error: fetchError } = await supabase
        .from("ticket_statuses")
        .select("key, label, sort_order, color, created_at, updated_at")
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true })

      if (fetchError) throw fetchError
      return statuses || []
    },
    staleTime: 5 * 60 * 1000,
  })

  const sortedStatuses = useMemo(() => sortTicketStatuses(data || []), [data])
  const resolvedStatuses = useMemo(() => {
    if (options?.fallback === false) {
      return sortedStatuses
    }
    return sortedStatuses.length ? sortedStatuses : DEFAULT_TICKET_STATUSES
  }, [options?.fallback, sortedStatuses])

  const statusMap = useMemo(
    () => new Map(resolvedStatuses.map((status) => [status.key, status])),
    [resolvedStatuses]
  )

  return {
    statuses: resolvedStatuses,
    rawStatuses: sortedStatuses,
    statusMap,
    loading: isLoading,
    error,
    refresh: refetch,
  }
}

