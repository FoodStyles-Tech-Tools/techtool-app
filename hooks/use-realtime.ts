"use client"

import { useEffect, useRef, useId, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSupabaseClient } from "@/lib/supabase-client"
import type { RealtimePostgresChangesPayload, RealtimeChannel } from "@supabase/supabase-js"

interface UseRealtimeSubscriptionOptions<T extends Record<string, any> = any> {
  table: string
  filter?: string
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void
  enabled?: boolean
}

type SubscriptionCallbacks<T extends Record<string, any> = any> = {
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void
}

type ChannelEntry = {
  channel: RealtimeChannel
  key: string
  table: string
  filter?: string
  listeners: Map<string, SubscriptionCallbacks>
}

const channelRegistry = new Map<string, ChannelEntry>()
const MAX_DEV_SUBSCRIPTIONS = 30
const isDev = process.env.NODE_ENV !== "production"

function makeChannelKey(table: string, filter?: string) {
  return filter ? `${table}::${filter}` : `${table}::all`
}

function dispatchPayload<T extends Record<string, any>>(
  listeners: Map<string, SubscriptionCallbacks>,
  payload: RealtimePostgresChangesPayload<T>
) {
  listeners.forEach((callbacks) => {
    try {
      if (payload.eventType === "INSERT" && callbacks.onInsert) {
        callbacks.onInsert(payload)
      } else if (payload.eventType === "UPDATE" && callbacks.onUpdate) {
        callbacks.onUpdate(payload)
      } else if (payload.eventType === "DELETE" && callbacks.onDelete) {
        callbacks.onDelete(payload)
      }
    } catch (error) {
      console.error(`[Realtime] Error handling ${payload.eventType} event:`, error)
    }
  })
}

function warnOnSubscriptionBudgetExceeded() {
  if (!isDev) return
  let listenerCount = 0
  channelRegistry.forEach((entry) => {
    listenerCount += entry.listeners.size
  })
  if (listenerCount > MAX_DEV_SUBSCRIPTIONS) {
    console.warn(
      `[Realtime] Active listeners (${listenerCount}) exceed budget (${MAX_DEV_SUBSCRIPTIONS}). ` +
        "Consider disabling non-critical realtime subscriptions on this route."
    )
  }
}

export function useRealtimeSubscription<T extends Record<string, any> = any>({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeSubscriptionOptions<T>) {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const channelKeyRef = useRef<string | null>(null)
  const subscriptionId = useId()
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected")
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const isCleaningUpRef = useRef(false)

  const subscribe = () => {
    if (!enabled || isCleaningUpRef.current) return

    const channelKey = makeChannelKey(table, filter)
    channelKeyRef.current = channelKey

    setConnectionStatus("connecting")

    const existingEntry = channelRegistry.get(channelKey)
    if (existingEntry) {
      existingEntry.listeners.set(subscriptionId, { onInsert, onUpdate, onDelete })
      channelRef.current = existingEntry.channel
      setConnectionStatus("connected")
      warnOnSubscriptionBudgetExceeded()
      return
    }

    const channelName = filter ? `${table}:${filter}` : `${table}:all`
    const listeners = new Map<string, SubscriptionCallbacks>()
    listeners.set(subscriptionId, { onInsert, onUpdate, onDelete })

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: "" },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: filter ? filter : undefined,
        },
        (payload) => {
          if (isCleaningUpRef.current) return
          const entry = channelRegistry.get(channelKey)
          if (!entry) return
          dispatchPayload(entry.listeners, payload as RealtimePostgresChangesPayload<T>)
        }
      )
      .subscribe((status, err) => {
        if (isCleaningUpRef.current) return

        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected")
          reconnectAttemptsRef.current = 0

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`[Realtime] Error subscribing to ${table}${filter ? ` (${filter})` : ""}:`, status, err)
          setConnectionStatus("error")

          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isCleaningUpRef.current) {
                try {
                  if (channelRef.current) {
                    supabase.removeChannel(channelRef.current)
                  }
                } catch (removeError) {
                  console.warn("[Realtime] Error removing channel before reconnect:", removeError)
                } finally {
                  channelRegistry.delete(channelKey)
                  channelRef.current = null
                  subscribe()
                }
              }
            }, delay)
          } else {
            console.error(`[Realtime] Max reconnection attempts reached for ${table}`)
          }
        } else if (status === "CLOSED") {
          setConnectionStatus("disconnected")
          if (!isCleaningUpRef.current && enabled) {
            reconnectAttemptsRef.current += 1
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
              const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
              reconnectTimeoutRef.current = setTimeout(() => {
                if (!isCleaningUpRef.current && enabled) {
                  channelRegistry.delete(channelKey)
                  channelRef.current = null
                  subscribe()
                }
              }, delay)
            }
          }
        }
      })

    channelRegistry.set(channelKey, {
      channel,
      key: channelKey,
      table,
      filter,
      listeners,
    })
    channelRef.current = channel
    warnOnSubscriptionBudgetExceeded()
  }

  useEffect(() => {
    const channelKey = makeChannelKey(table, filter)

    const updateCallbacks = () => {
      const entry = channelRegistry.get(channelKey)
      if (!entry) return
      const existing = entry.listeners.get(subscriptionId)
      if (!existing) return
      entry.listeners.set(subscriptionId, { ...existing, onInsert, onUpdate, onDelete })
    }

    updateCallbacks()
  }, [table, filter, onInsert, onUpdate, onDelete, subscriptionId])

  useEffect(() => {
    const channelKey = makeChannelKey(table, filter)
    if (!enabled) {
      const entry = channelRegistry.get(channelKey)
      if (entry) {
        entry.listeners.delete(subscriptionId)
        if (entry.listeners.size === 0) {
          try {
            supabase.removeChannel(entry.channel)
          } catch (error) {
            console.warn("[Realtime] Error removing channel:", error)
          }
          channelRegistry.delete(channelKey)
        }
      }
      if (channelRef.current) {
        isCleaningUpRef.current = true
        channelRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      setConnectionStatus("disconnected")
      return
    }

    isCleaningUpRef.current = false
    reconnectAttemptsRef.current = 0
    subscribe()

    return () => {
      isCleaningUpRef.current = true

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      const activeKey = channelKeyRef.current || channelKey
      const entry = channelRegistry.get(activeKey)
      if (entry) {
        entry.listeners.delete(subscriptionId)
        if (entry.listeners.size === 0) {
          try {
            supabase.removeChannel(entry.channel)
          } catch (error) {
            console.warn("[Realtime] Error removing channel on cleanup:", error)
          }
          channelRegistry.delete(activeKey)
        }
      }

      if (channelRef.current) {
        try {
          if (!entry) {
            supabase.removeChannel(channelRef.current)
          }
        } catch (error) {
          console.warn("[Realtime] Error removing channel on cleanup:", error)
        }
        channelRef.current = null
      }

      setConnectionStatus("disconnected")
    }
  }, [table, filter, enabled, subscriptionId, supabase])

  return { queryClient, connectionStatus }
}
