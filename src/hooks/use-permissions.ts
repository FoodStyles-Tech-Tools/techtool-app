"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "@client/lib/auth-client"
import { buildPermissionFlags } from "@shared/permissions"
import type { Permission, PermissionFlags } from "@shared/types/auth"
import type { User as BaseUser } from "@shared/types"

interface PermissionsUser extends BaseUser {
  permissions?: Permission[]
}

export type PermissionsCache = {
  user: PermissionsUser | null
  flags: PermissionFlags
  ts: number
}

const PERMISSIONS_REFRESH_EVENT = "permissions:refresh"
const CACHE_KEY = "tt.permissions"
const CACHE_TTL_MS = 5 * 60 * 1000

declare global {
  interface Window {
    __PERMISSIONS_CACHE__?: PermissionsCache
  }
}

function readPermissionsCache(): PermissionsCache | null {
  if (typeof window === "undefined") return null

  const inMemory = window.__PERMISSIONS_CACHE__
  if (inMemory && Date.now() - inMemory.ts < CACHE_TTL_MS) {
    return inMemory
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PermissionsCache
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL_MS) {
      return null
    }
    window.__PERMISSIONS_CACHE__ = parsed
    return parsed
  } catch {
    return null
  }
}

function writePermissionsCache(payload: PermissionsCache) {
  if (typeof window === "undefined") return
  window.__PERMISSIONS_CACHE__ = payload
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // ignore cache write failures
  }
}

export function emitPermissionsRefresh() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(PERMISSIONS_REFRESH_EVENT))
}

export function usePermissions() {
  const { data: session, isPending } = useSession()
  // Keep initial client render deterministic with server render.
  // Cache hydration happens after mount in an effect.
  const [user, setUser] = useState<PermissionsUser | null>(null)
  const [flags, setFlags] = useState<PermissionFlags>(buildPermissionFlags())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session?.user?.email) {
      setUser(null)
      setFlags(buildPermissionFlags())
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let nextUser: User | null = null
      let nextFlags: PermissionFlags = buildPermissionFlags()
      let cacheTs = Date.now()

      const bootstrapRes = await fetch("/api/v2/bootstrap")
      if (bootstrapRes.ok) {
        const bootstrapData = await bootstrapRes.json()
        nextUser = bootstrapData?.user ?? null
        nextFlags = bootstrapData?.flags ?? buildPermissionFlags(nextUser?.permissions || [])
        cacheTs = typeof bootstrapData?.ts === "number" ? bootstrapData.ts : Date.now()
      } else {
        const res = await fetch("/api/auth/me", { cache: "no-store" })
        if (!res.ok) {
          setUser(null)
          setFlags(buildPermissionFlags())
          return
        }
        const data = await res.json()
        nextUser = data?.user ?? null
        nextFlags = buildPermissionFlags(nextUser?.permissions || [])
      }

      setUser(nextUser)
      setFlags(nextFlags)
      writePermissionsCache({ user: nextUser, flags: nextFlags, ts: cacheTs })
    } catch (error) {
      console.error("Failed to load permissions:", error)
      setUser(null)
      setFlags(buildPermissionFlags())
    } finally {
      setLoading(false)
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (isPending) return

    const cache = readPermissionsCache()
    if (!cache) {
      void refresh()
      return
    }

    // If cached flags are from an older app version (missing new keys), refetch so we get full shape
    const defaultFlags = buildPermissionFlags()
    const hasFullShape =
      cache.flags &&
      "canViewAuditLog" in cache.flags &&
      "canViewDeployRounds" in cache.flags
    if (!hasFullShape) {
      void refresh()
      return
    }

    setUser(cache.user ?? null)
    setFlags({ ...defaultFlags, ...cache.flags })
    setLoading(false)

    const isStale = Date.now() - cache.ts > CACHE_TTL_MS
    if (isStale) {
      void refresh()
    }
  }, [isPending, refresh])

  useEffect(() => {
    const handler = () => {
      void refresh()
    }
    window.addEventListener(PERMISSIONS_REFRESH_EVENT, handler)
    return () => window.removeEventListener(PERMISSIONS_REFRESH_EVENT, handler)
  }, [refresh])

  return {
    user,
    flags,
    loading: isPending || loading,
    refresh,
  }
}
