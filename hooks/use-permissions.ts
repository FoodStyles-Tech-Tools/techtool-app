"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "@/lib/auth-client"

interface Permission {
  resource: string
  action: string
}

interface User {
  id: string
  email: string
  name: string | null
  role: string | null
  image: string | null
  permissions?: Permission[]
}

export type PermissionFlags = {
  canViewProjects: boolean
  canCreateProjects: boolean
  canEditProjects: boolean
  canViewAssets: boolean
  canCreateAssets: boolean
  canEditAssets: boolean
  canDeleteAssets: boolean
  canManageAssets: boolean
  canViewClockify: boolean
  canManageClockify: boolean
  canViewTickets: boolean
  canCreateTickets: boolean
  canEditTickets: boolean
  canViewUsers: boolean
  canCreateUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
  canViewRoles: boolean
  canCreateRoles: boolean
  canEditRoles: boolean
  canDeleteRoles: boolean
  canManageStatus: boolean
  canManageSettings: boolean
  canAccessSettings: boolean
}

export type PermissionsCache = {
  user: User | null
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

function computeFlags(permissions: Permission[] = []): PermissionFlags {
  const has = (resource: string, action: string) =>
    permissions.some((p) => p.resource === resource && p.action === action)

  const canAccessSettings =
    has("users", "view") ||
    has("roles", "view") ||
    has("roles", "edit") ||
    has("roles", "create") ||
    has("roles", "manage") ||
    has("status", "manage") ||
    has("settings", "manage")

  return {
    canViewProjects: has("projects", "view"),
    canCreateProjects: has("projects", "create"),
    canEditProjects: has("projects", "edit"),
    canViewAssets: has("assets", "view"),
    canCreateAssets: has("assets", "create"),
    canEditAssets: has("assets", "edit"),
    canDeleteAssets: has("assets", "delete"),
    canManageAssets: has("assets", "manage"),
    canViewClockify: has("clockify", "view"),
    canManageClockify: has("clockify", "manage"),
    canViewTickets: has("tickets", "view"),
    canCreateTickets: has("tickets", "create"),
    canEditTickets: has("tickets", "edit"),
    canViewUsers: has("users", "view"),
    canCreateUsers: has("users", "create"),
    canEditUsers: has("users", "edit"),
    canDeleteUsers: has("users", "delete"),
    canViewRoles: has("roles", "view"),
    canCreateRoles: has("roles", "create"),
    canEditRoles: has("roles", "edit"),
    canDeleteRoles: has("roles", "delete"),
    canManageStatus: has("status", "manage"),
    canManageSettings: has("settings", "manage"),
    canAccessSettings,
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
  const [user, setUser] = useState<User | null>(null)
  const [flags, setFlags] = useState<PermissionFlags>(computeFlags())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session?.user?.email) {
      setUser(null)
      setFlags(computeFlags())
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let nextUser: User | null = null
      let nextFlags: PermissionFlags = computeFlags()
      let cacheTs = Date.now()

      const bootstrapRes = await fetch("/api/v2/bootstrap")
      if (bootstrapRes.ok) {
        const bootstrapData = await bootstrapRes.json()
        nextUser = bootstrapData?.user ?? null
        nextFlags = bootstrapData?.flags ?? computeFlags(nextUser?.permissions || [])
        cacheTs = typeof bootstrapData?.ts === "number" ? bootstrapData.ts : Date.now()
      } else {
        const res = await fetch("/api/auth/me", { cache: "no-store" })
        if (!res.ok) {
          setUser(null)
          setFlags(computeFlags())
          return
        }
        const data = await res.json()
        nextUser = data?.user ?? null
        nextFlags = computeFlags(nextUser?.permissions || [])
      }

      setUser(nextUser)
      setFlags(nextFlags)
      writePermissionsCache({ user: nextUser, flags: nextFlags, ts: cacheTs })
    } catch (error) {
      console.error("Failed to load permissions:", error)
      setUser(null)
      setFlags(computeFlags())
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

    setUser(cache.user ?? null)
    setFlags(cache.flags ?? computeFlags(cache.user?.permissions))
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
