/** Normalize DB/storage link value to string array (handles JSONB array or {url} objects). */
export function sanitizeLinkArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim()
      if (item && typeof item === "object" && "url" in item && typeof (item as { url: string }).url === "string") {
        return (item as { url: string }).url.trim()
      }
      return ""
    })
    .filter((url) => url.length > 0)
}

/** Prepare links for insert/update payload. */
export function prepareLinkPayload(links?: string[]): string[] {
  if (!links) return []
  return links
    .map((link) => (typeof link === "string" ? link.trim() : ""))
    .filter((url) => url.length > 0)
}
