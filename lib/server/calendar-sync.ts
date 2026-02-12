import "server-only"

import { fetchGoogleCalendarEvents, refreshAccessToken } from "@/lib/google-calendar"
import { deleteServerCache, getServerCache, setServerCache } from "@/lib/server/cache"
import type { CalendarEvent } from "@/lib/types"
import type { SupabaseClient } from "@supabase/supabase-js"

export type CalendarState = {
  status: "connected" | "needs_connection"
  events: CalendarEvent[]
  error: string | null
}

type CalendarCachePayload = {
  events: CalendarEvent[]
  syncedAt: string
}

type CalendarTokenRow = {
  id: string
  refresh_token: string
  access_token: string | null
  access_token_expires_at: string | null
  scope: string | null
}

const CALENDAR_EVENTS_CACHE_TTL_SECONDS = Number(
  process.env.CALENDAR_EVENTS_CACHE_TTL_SECONDS || 120
)

function getCalendarCacheKey(userId: string) {
  return `calendar:events:${userId}`
}

async function getCalendarToken(
  supabase: SupabaseClient,
  userId: string
): Promise<CalendarTokenRow | null> {
  const { data: tokenRow, error } = await supabase
    .from("user_calendar_tokens")
    .select("id, refresh_token, access_token, access_token_expires_at, scope")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle()

  if (error) {
    throw new Error("Failed to load calendar connection")
  }

  return (tokenRow as CalendarTokenRow | null) || null
}

async function ensureAccessToken(
  supabase: SupabaseClient,
  tokenRow: CalendarTokenRow
): Promise<string> {
  let accessToken = tokenRow.access_token
  const expiresAt = tokenRow.access_token_expires_at
  const shouldRefresh =
    !accessToken ||
    (typeof accessToken === "string" && accessToken.trim() === "") ||
    !expiresAt ||
    new Date(expiresAt).getTime() <= Date.now() + 60 * 1000

  if (!shouldRefresh) {
    if (!accessToken || accessToken.trim() === "") {
      throw new Error("Calendar token missing")
    }
    return accessToken
  }

  try {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token)
    accessToken = refreshed.access_token
    const expiresInSeconds = refreshed.expires_in || 3600
    const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

    await supabase
      .from("user_calendar_tokens")
      .update({
        access_token: refreshed.access_token,
        access_token_expires_at: newExpiresAt,
        scope: refreshed.scope || tokenRow.scope,
      })
      .eq("id", tokenRow.id)
  } catch {
    await supabase.from("user_calendar_tokens").delete().eq("id", tokenRow.id)
    throw new Error("Calendar connection expired. Please reconnect.")
  }

  if (!accessToken || accessToken.trim() === "") {
    throw new Error("Calendar token missing")
  }

  return accessToken
}

export async function getCachedCalendarState(userId: string): Promise<CalendarState | null> {
  const cache = await getServerCache<CalendarCachePayload>(getCalendarCacheKey(userId))
  if (!cache) {
    return null
  }

  return {
    status: "connected",
    events: cache.events,
    error: null,
  }
}

export async function syncCalendarState(
  supabase: SupabaseClient,
  userId: string
): Promise<CalendarState> {
  const tokenRow = await getCalendarToken(supabase, userId)
  if (!tokenRow) {
    await deleteServerCache(getCalendarCacheKey(userId))
    return {
      status: "needs_connection",
      events: [],
      error: null,
    }
  }

  const accessToken = await ensureAccessToken(supabase, tokenRow)
  const eventsResponse = await fetchGoogleCalendarEvents({ accessToken })
  const events = (eventsResponse.items || []) as CalendarEvent[]

  await setServerCache(
    getCalendarCacheKey(userId),
    { events, syncedAt: new Date().toISOString() },
    CALENDAR_EVENTS_CACHE_TTL_SECONDS
  )

  return {
    status: "connected",
    events,
    error: null,
  }
}

export async function getCalendarStateWithCache(
  supabase: SupabaseClient,
  userId: string
): Promise<CalendarState> {
  const cached = await getCachedCalendarState(userId)
  if (cached) {
    return cached
  }

  try {
    return await syncCalendarState(supabase, userId)
  } catch (error) {
    return {
      status: "connected",
      events: [],
      error: error instanceof Error ? error.message : "Failed to load events",
    }
  }
}
