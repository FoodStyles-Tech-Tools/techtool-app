const warnedLegacyKeys = new Set<string>()

function warnLegacyEnv(legacyKey: string, preferredKey: string) {
  if (warnedLegacyKeys.has(legacyKey)) {
    return
  }

  warnedLegacyKeys.add(legacyKey)
  console.warn(`[env] ${legacyKey} is deprecated. Use ${preferredKey} instead.`)
}

function readServerEnv(preferredKey: string, legacyKeys: string[] = []) {
  const preferredValue = process.env[preferredKey]
  if (preferredValue?.trim()) {
    return preferredValue.trim()
  }

  for (const legacyKey of legacyKeys) {
    const legacyValue = process.env[legacyKey]
    if (legacyValue?.trim()) {
      warnLegacyEnv(legacyKey, preferredKey)
      return legacyValue.trim()
    }
  }

  return undefined
}

export function getServerPort() {
  return Number(process.env.PORT || 4000)
}

export function getServerAppUrl() {
  return readServerEnv("APP_URL", ["VITE_APP_URL", "NEXT_PUBLIC_APP_URL"]) || "http://localhost:5173"
}

export function getServerSupabaseUrl() {
  const url = readServerEnv("SUPABASE_URL", [
    "VITE_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "VITE_PUBLIC_SUPABASE_URL",
  ])

  if (!url) {
    throw new Error("Missing Supabase URL. Please set SUPABASE_URL.")
  }

  return url
}

export function getServerSupabaseAnonKey() {
  const key = readServerEnv("SUPABASE_ANON_KEY", [
    "VITE_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "VITE_PUBLIC_SUPABASE_ANON_KEY",
  ])

  if (!key) {
    throw new Error("Missing Supabase anon key. Please set SUPABASE_ANON_KEY.")
  }

  return key
}
