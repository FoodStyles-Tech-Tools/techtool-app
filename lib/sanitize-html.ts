/**
 * Sanitize HTML for safe use with dangerouslySetInnerHTML.
 * Strips script, style, iframe, object, and other dangerous elements.
 * Use for user-generated or external HTML (e.g. calendar event summaries, rich text).
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "span", "strong", "em", "u", "b", "i", "a", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre", "div",
])

const DANGEROUS_TAGS = ["script", "style", "iframe", "object", "embed", "form", "input", "button"]

/**
 * Sanitize HTML string for safe injection. Removes dangerous tags and returns
 * the inner HTML of body, or plain text if parsing fails.
 */
export function sanitizeHtml(html: string | null | undefined): string | null {
  if (html == null || typeof html !== "string") return null
  const trimmed = html.trim()
  if (!trimmed) return null

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(trimmed, "text/html")

    doc.querySelectorAll(DANGEROUS_TAGS.join(",")).forEach((el) => el.remove())

    // Optional: strip any element with event handlers or javascript: in href
    doc.querySelectorAll("[onclick], [onload], [onerror], a[href^='javascript:']").forEach((el) => el.remove())

    const out = doc.body.innerHTML.trim()
    return out || doc.body.textContent?.trim() || null
  } catch {
    return trimmed
  }
}

/**
 * Return sanitized HTML for use with dangerouslySetInnerHTML, or null if nothing safe to show.
 */
export function getSanitizedHtmlProps(html: string | null | undefined): { __html: string } | null {
  const safe = sanitizeHtml(html)
  if (!safe) return null
  return { __html: safe }
}
