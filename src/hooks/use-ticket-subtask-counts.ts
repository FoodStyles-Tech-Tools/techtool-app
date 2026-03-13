"use client"

import { useQuery } from "@tanstack/react-query"
import { createQueryString, requestJson } from "@client/lib/api"

type SubtaskCountResponse = {
  counts: Record<string, number>
}

export function useTicketSubtaskCounts(parentTicketIds: string[]) {
  const stableParentTicketIds = [...parentTicketIds].sort()

  return useQuery<Record<string, number>>({
    queryKey: ["ticket-subtask-counts", stableParentTicketIds],
    enabled: stableParentTicketIds.length > 0,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (stableParentTicketIds.length === 0) {
        return {}
      }

      const query = createQueryString({
        ids: stableParentTicketIds.join(","),
      })
      const response = await requestJson<SubtaskCountResponse>(`/api/tickets/subtask-counts${query}`)
      return response.counts || {}
    },
  })
}
