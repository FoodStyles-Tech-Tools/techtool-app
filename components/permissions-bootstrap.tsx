"use client"

import type { PermissionsCache } from "@/hooks/use-permissions"

const CACHE_KEY = "tt.permissions"

declare global {
  interface Window {
    __PERMISSIONS_CACHE__?: PermissionsCache
  }
}

export function PermissionsBootstrap({ payload }: { payload: PermissionsCache }) {
  if (typeof window !== "undefined") {
    window.__PERMISSIONS_CACHE__ = payload
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
    } catch {
      // ignore cache write failures
    }
  }

  return null
}
