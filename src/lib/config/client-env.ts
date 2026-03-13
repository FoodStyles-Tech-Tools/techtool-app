"use client"

import packageJson from "../../../package.json"

const warnedLegacyKeys = new Set<string>()
const clientEnv = import.meta.env as Record<string, string | boolean | undefined>

function warnLegacyEnv(legacyKey: string, preferredKey: string) {
  if (!import.meta.env.DEV || warnedLegacyKeys.has(legacyKey)) {
    return
  }

  warnedLegacyKeys.add(legacyKey)
  console.warn(`[env] ${legacyKey} is deprecated. Use ${preferredKey} instead.`)
}

function readClientEnv(preferredKey: string, legacyKeys: string[] = []) {
  const preferredValue = clientEnv[preferredKey]
  if (typeof preferredValue === "string" && preferredValue.trim()) {
    return preferredValue.trim()
  }

  for (const legacyKey of legacyKeys) {
    const legacyValue = clientEnv[legacyKey]
    if (typeof legacyValue === "string" && legacyValue.trim()) {
      warnLegacyEnv(legacyKey, preferredKey)
      return legacyValue.trim()
    }
  }

  return undefined
}

export function getClientAppUrl() {
  return readClientEnv("VITE_APP_URL", ["VITE_PUBLIC_APP_URL"]) || "http://localhost:5173"
}

export function getClientBackendUrl() {
  // In production on Vercel, prefer deriving from the current origin to avoid misconfigured envs.
  if (typeof window !== "undefined") {
    const origin = window.location.origin
    if (origin.includes("techtool-app.vercel.app")) {
      return `${origin}/api/server`
    }
  }

  return readClientEnv("VITE_BACKEND_URL", ["VITE_SERVER_URL", "VITE_API_URL"]) || "http://localhost:4000"
}

export function getClientSupabaseUrl() {
  const url = readClientEnv("VITE_SUPABASE_URL", ["VITE_PUBLIC_SUPABASE_URL"])
  if (!url) {
    throw new Error("Missing Supabase URL. Please set VITE_SUPABASE_URL.")
  }
  return url
}

export function getClientSupabaseAnonKey() {
  const key = readClientEnv("VITE_SUPABASE_ANON_KEY", ["VITE_PUBLIC_SUPABASE_ANON_KEY"])
  if (!key) {
    throw new Error("Missing Supabase anon key. Please set VITE_SUPABASE_ANON_KEY.")
  }
  return key
}

export function getClientAppVersion() {
  const rawVersion =
    (packageJson as { version?: string }).version?.trim() || "0.0.0"
  return rawVersion.slice(0, 7)
}
