"use client"

import { useEffect, useRef, useId, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSupabaseClient } from "@/lib/supabase"
import type { RealtimePostgresChangesPayload, RealtimeChannel } from "@supabase/supabase-js"

interface UseRealtimeSubscriptionOptions<T = any> {
  table: string
  filter?: string
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void
  enabled?: boolean
}

export function useRealtimeSubscription<T = any>({
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
  const subscriptionId = useId()
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected")
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Use refs for callbacks to avoid recreating subscriptions
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)

  useEffect(() => {
    onInsertRef.current = onInsert
    onUpdateRef.current = onUpdate
    onDeleteRef.current = onDelete
  }, [onInsert, onUpdate, onDelete])

  const isCleaningUpRef = useRef(false)

  const subscribe = () => {
    if (!enabled || isCleaningUpRef.current) return

    // Create unique channel name to avoid conflicts
    const channelName = filter 
      ? `${table}:${filter}:${subscriptionId}` 
      : `${table}:${subscriptionId}`
    
    // Clean up existing channel if any
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current)
      } catch (error) {
        console.warn("[Realtime] Error removing existing channel:", error)
      }
      channelRef.current = null
    }

    setConnectionStatus("connecting")

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
          
          try {
            if (payload.eventType === "INSERT" && onInsertRef.current) {
              onInsertRef.current(payload as RealtimePostgresChangesPayload<T>)
            } else if (payload.eventType === "UPDATE" && onUpdateRef.current) {
              onUpdateRef.current(payload as RealtimePostgresChangesPayload<T>)
            } else if (payload.eventType === "DELETE" && onDeleteRef.current) {
              onDeleteRef.current(payload as RealtimePostgresChangesPayload<T>)
            }
          } catch (error) {
            console.error(`[Realtime] Error handling ${payload.eventType} event:`, error)
          }
        }
      )
      .subscribe((status, err) => {
        if (isCleaningUpRef.current) return

        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected")
          reconnectAttemptsRef.current = 0
          
          // Clear any pending reconnection attempts
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`[Realtime] Error subscribing to ${table}${filter ? ` (${filter})` : ""}:`, status, err)
          setConnectionStatus("error")
          
          // Attempt to reconnect with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000) // Max 30 seconds
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isCleaningUpRef.current) {
                subscribe()
              }
            }, delay)
          } else {
            console.error(`[Realtime] Max reconnection attempts reached for ${table}`)
          }
        } else if (status === "CLOSED") {
          setConnectionStatus("disconnected")
          
          // Attempt to reconnect if not cleaning up
          if (!isCleaningUpRef.current && enabled) {
            reconnectAttemptsRef.current += 1
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
              const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
              reconnectTimeoutRef.current = setTimeout(() => {
                if (!isCleaningUpRef.current && enabled) {
                  subscribe()
                }
              }, delay)
            }
          }
        }
      })

    channelRef.current = channel
  }

  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled
      if (channelRef.current) {
        isCleaningUpRef.current = true
        try {
          supabase.removeChannel(channelRef.current)
        } catch (error) {
          console.warn("[Realtime] Error removing channel:", error)
        }
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
      
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      
      // Remove channel
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current)
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

