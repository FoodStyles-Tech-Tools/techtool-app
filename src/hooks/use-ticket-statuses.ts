"use client"

import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { requestJson } from "@client/lib/api"
import {
  DEFAULT_TICKET_STATUSES,
  sortTicketStatuses,
  type TicketStatus,
} from "@shared/ticket-statuses"

type UseTicketStatusesOptions = {
  fallback?: boolean
  enabled?: boolean
  realtime?: boolean
}

export function useTicketStatuses(options?: UseTicketStatusesOptions) {
  const queryClient = useQueryClient()
  const enabled = options?.enabled !== false
  const realtime = options?.realtime === true

  useRealtimeSubscription({
    table: "ticket_statuses",
    enabled: enabled && realtime,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-statuses"] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-statuses"] })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-statuses"] })
    },
  })

  const { data, isLoading, refetch, error } = useQuery<TicketStatus[]>({
    queryKey: ["ticket-statuses"],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await requestJson<{ statuses: TicketStatus[] }>("/api/ticket-statuses")
      return response.statuses || []
    },
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
