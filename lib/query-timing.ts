/**
 * Query timing utilities for performance monitoring
 */

export interface QueryTiming {
  label: string
  startTime: number
  endTime?: number
  duration?: number
}

const timingMap = new Map<string, QueryTiming>()

/**
 * Start timing a query
 */
export function startTiming(label: string): string {
  const id = `${label}-${Date.now()}-${Math.random()}`
  timingMap.set(id, {
    label,
    startTime: performance.now(),
  })
  return id
}

/**
 * End timing a query and log the duration
 */
export function endTiming(id: string, logThreshold: number = 100): number | null {
  const timing = timingMap.get(id)
  if (!timing) {
    return null
  }

  const endTime = performance.now()
  const duration = endTime - timing.startTime

  timing.endTime = endTime
  timing.duration = duration

  // Log slow queries
  if (duration > logThreshold) {
    console.log(`[SLOW QUERY] ${timing.label}: ${duration.toFixed(2)}ms`)
  }

  timingMap.delete(id)
  return duration
}

/**
 * Time a promise-returning function
 */
export async function timeQuery<T>(
  label: string,
  fn: () => T,
  logThreshold: number = 100
): Promise<Awaited<T>> {
  const id = startTiming(label)
  try {
    const result = await fn()
    const duration = endTiming(id, logThreshold)
    if (duration && duration > logThreshold) {
      console.log(`[TIMED] ${label}: ${duration.toFixed(2)}ms`)
    }
    return result as Awaited<T>
  } catch (error) {
    endTiming(id, logThreshold)
    throw error
  }
}
