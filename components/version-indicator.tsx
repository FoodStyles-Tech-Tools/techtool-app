"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { APP_VERSION } from "@/lib/version"
import { cn } from "@/lib/utils"

const POLL_INTERVAL = 60_000

async function clearIndexedDB() {
  const getDatabases = (indexedDB as any)?.databases
  if (typeof getDatabases !== "function") {
    return
  }

  const databases: Array<{ name?: string }> = await getDatabases.call(indexedDB)
  await Promise.all(
    databases
      .map((db) => db?.name)
      .filter(Boolean)
      .map(
        (name) =>
          new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(name as string)
            request.onsuccess = request.onerror = request.onblocked = () => resolve()
          })
      )
  )
}

async function clearCaches() {
  if (!("caches" in window)) return
  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
}

async function clearCookies() {
  const cookies = document.cookie ? document.cookie.split(";") : []
  cookies.forEach((cookie) => {
    const eqPos = cookie.indexOf("=")
    const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim()
    if (!name) return
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`
  })
}

async function clearServiceWorkers() {
  if (!("serviceWorker" in navigator)) return
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((reg) => reg.unregister()))
}

async function clearPersistentStorage() {
  try {
    localStorage.clear()
  } catch (error) {
    console.warn("Unable to clear localStorage", error)
  }

  await Promise.all([
    clearIndexedDB(),
    clearCaches(),
    clearCookies(),
    clearServiceWorkers(),
  ])
}

export function VersionIndicator({ className }: { className?: string }) {
  const initialVersion = useMemo(() => APP_VERSION || "0.0.0", [])
  const [latestVersion, setLatestVersion] = useState(initialVersion)
  const [checking, setChecking] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const updateAvailable = latestVersion !== initialVersion

  const checkVersion = useCallback(async () => {
    setChecking(true)
    try {
      const response = await fetch(`/api/version?ts=${Date.now()}`, {
        cache: "no-store",
      })
      if (!response.ok) return
      const data = await response.json()
      if (typeof data?.version === "string") {
        setLatestVersion(data.version)
      }
    } catch (error) {
      console.warn("Failed to check version", error)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    checkVersion()
    const interval = setInterval(checkVersion, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [checkVersion])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await clearPersistentStorage()
    } finally {
      window.location.reload()
    }
  }, [])

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border border-border/70 px-2 py-1 text-xs",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            updateAvailable ? "bg-red-500 animate-pulse" : "bg-emerald-500"
          )}
        />
        <p className="font-medium text-foreground">
          Version: <span className="text-muted-foreground">v{initialVersion}</span>
        </p>
      </div>
      {updateAvailable && (
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-md border border-destructive/60 px-2 py-0.5 text-[11px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {refreshing ? "Refreshing" : "Fetch"}
        </button>
      )}
    </div>
  )
}
