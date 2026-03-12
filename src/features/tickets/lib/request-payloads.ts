"use client"

/**
 * Returns a shallow copy of obj with only keys whose values are not undefined.
 * Useful for building API request bodies from optional fields.
 */
export function pickDefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>
}
