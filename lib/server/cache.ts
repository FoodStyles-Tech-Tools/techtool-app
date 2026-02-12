import "server-only"

type CacheEnvelope<T> = {
  value: T
  expiresAt: number
}

const inMemoryCache = new Map<string, CacheEnvelope<unknown>>()
const isDev = process.env.NODE_ENV !== "production"

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url, token }
}

async function runUpstashCommand(command: Array<string | number>) {
  const config = getUpstashConfig()
  if (!config) return null

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Upstash command failed with ${response.status}`)
  }

  const payload = await response.json()
  return payload?.result
}

export async function getServerCache<T>(key: string): Promise<T | null> {
  try {
    const external = await runUpstashCommand(["GET", key])
    if (external) {
      return JSON.parse(external) as T
    }
  } catch (error) {
    if (isDev) {
      console.warn(`[Cache] Failed to read Upstash key "${key}"`, error)
    }
  }

  const cached = inMemoryCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    inMemoryCache.delete(key)
    return null
  }
  return cached.value as T
}

export async function setServerCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const expiresAt = Date.now() + ttlSeconds * 1000

  try {
    await runUpstashCommand(["SET", key, JSON.stringify(value), "EX", ttlSeconds])
  } catch (error) {
    if (isDev) {
      console.warn(`[Cache] Failed to write Upstash key "${key}"`, error)
    }
  }

  inMemoryCache.set(key, { value, expiresAt })
}

export async function deleteServerCache(key: string): Promise<void> {
  try {
    await runUpstashCommand(["DEL", key])
  } catch (error) {
    if (isDev) {
      console.warn(`[Cache] Failed to delete Upstash key "${key}"`, error)
    }
  }

  inMemoryCache.delete(key)
}

export async function getOrSetServerCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = await getServerCache<T>(key)
  if (cached !== null) {
    return cached
  }

  const value = await loader()
  await setServerCache(key, value, ttlSeconds)
  return value
}
