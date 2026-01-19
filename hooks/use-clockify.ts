"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export interface ClockifyReportSession {
  id: string
  start_date: string
  end_date: string
  fetched_at: string
  status: string
  error_message: string | null
  report_data: any
  reconciliation?: Record<string, { ticketDisplayId?: string; status?: string; ticketId?: string }>
  requested_by_id: string | null
}

export interface ClockifySettings {
  id: string
  schedule: string
}

interface ClockifySessionQuery {
  startDate?: string
  endDate?: string
}

export function useClockifySessions(params?: ClockifySessionQuery) {
  return useQuery<ClockifyReportSession[]>({
    queryKey: ["clockify-sessions", params?.startDate, params?.endDate],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.startDate) searchParams.set("start", params.startDate)
      if (params?.endDate) searchParams.set("end", params.endDate)

      const query = searchParams.toString()
      const response = await fetch(`/api/clockify/sessions${query ? `?${query}` : ""}`)
      if (!response.ok) {
        throw new Error("Failed to load Clockify sessions")
      }
      const data = await response.json()
      return data.sessions || []
    },
  })
}

export function useCreateClockifySession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { startDate: string; endDate: string; clearSessions?: boolean }) => {
      const response = await fetch("/api/clockify/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "Failed to fetch Clockify report")
      }

      return response.json()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clockify-sessions"] })
    },
  })
}

export function useClockifySettings() {
  return useQuery<ClockifySettings>({
    queryKey: ["clockify-settings"],
    queryFn: async () => {
      const response = await fetch("/api/clockify/settings")
      if (!response.ok) {
        throw new Error("Failed to load Clockify settings")
      }
      const data = await response.json()
      return data.settings
    },
  })
}

export function useUpdateClockifySettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { schedule: string }) => {
      const response = await fetch("/api/clockify/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "Failed to update Clockify settings")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clockify-settings"] })
    },
  })
}
