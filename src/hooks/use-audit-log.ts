"use client"

import { useQuery } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"

export type AuditLogModule =
  | "projects"
  | "epics"
  | "sprints"
  | "assets"
  | "users"
  | "roles"
  | "tickets"

export type AuditLogItem = {
  id: string
  module: string
  resource_type: string
  resource_id: string
  ticket_id: string | null
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

type AuditLogResponse = {
  activities: AuditLogItem[]
}

export function useAuditLog(
  module: AuditLogModule,
  options?: {
    resource_id?: string
    limit?: number
    enabled?: boolean
  }
) {
  const queryClient = useQueryClient()
  const resourceId = options?.resource_id
  const limit = options?.limit ?? 100
  const enabled = (options?.enabled !== false) && !!module

  const filter = `module=eq.${module}`

  useRealtimeSubscription({
    table: "audit_log",
    filter,
    enabled,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-log", module, resourceId] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-log", module, resourceId] })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-log", module, resourceId] })
    },
  })

  return useQuery<AuditLogResponse>({
    queryKey: ["audit-log", module, resourceId],
    queryFn: async () => {
      const params = new URLSearchParams({ module, limit: String(limit) })
      if (resourceId) params.set("resource_id", resourceId)
      const res = await fetch(`/api/audit-log?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to load audit log" }))
        throw new Error(err.error || "Failed to load audit log")
      }
      return res.json()
    },
    enabled,
    staleTime: 15 * 1000,
  })
}

/** Fetch full audit log (all modules). Requires audit_log:view permission. */
export function useAuditLogAll(options?: { limit?: number; enabled?: boolean }) {
  const queryClient = useQueryClient()
  const limit = options?.limit ?? 300
  const enabled = options?.enabled !== false

  useRealtimeSubscription({
    table: "audit_log",
    filter: undefined,
    enabled,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-log", "all"] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-log", "all"] })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-log", "all"] })
    },
  })

  return useQuery<AuditLogResponse>({
    queryKey: ["audit-log", "all"],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) })
      const res = await fetch(`/api/audit-log?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to load audit log" }))
        throw new Error(err.error || "Failed to load audit log")
      }
      return res.json()
    },
    enabled,
    staleTime: 15 * 1000,
  })
}
