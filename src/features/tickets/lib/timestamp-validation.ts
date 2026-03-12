"use client"

export function parseTimestamp(timestamp: string | null | undefined): Date | null {
  if (!timestamp) return null
  return new Date(timestamp)
}
