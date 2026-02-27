"use client"

import { useQuery } from "@tanstack/react-query"
import { createQueryString, requestJson } from "@/lib/client/api"

type SubtaskCountResponse = {
  counts: Record<string, number>
}

export function useTicketSubtaskCounts(parentTicketIds: string[]) {
  return useQuery<Record<string, number>>({
    queryKey: ["ticket-subtask-counts", parentTicketIds],
    enabled: parentTicketIds.length > 0,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (parentTicketIds.length === 0) {
        return {}
      }

      const query = createQueryString({
        ids: parentTicketIds.join(","),
      })
      const response = await requestJson<SubtaskCountResponse>(`/api/tickets/subtask-counts${query}`)
      return response.counts || {}
    },
  })
}
