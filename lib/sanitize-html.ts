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
const TICKET_URL_PATTERN = /https?:\/\/techtool-app\.vercel\.app\/tickets\/([a-z]{2,}-\d+)\b/gi
const HAS_TICKET_URL_PATTERN = /https?:\/\/techtool-app\.vercel\.app\/tickets\/([a-z]{2,}-\d+)\b/i

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderTicketBadge(slugRaw: string): string {
  const slug = String(slugRaw || "").toLowerCase()
  const displayId = slug.toUpperCase()
  const safeSlug = escapeHtml(slug)
  const safeDisplayId = escapeHtml(displayId)
  return `<a data-mention-badge="true" data-mention-type="ticket" data-mention-label="${safeDisplayId}" class="mention-pill mention-ticket" href="/tickets/${safeSlug}"><span class="mention-ticket-label">${safeDisplayId}</span></a>`
}

function convertTicketUrlsToBadges(html: string): string {
  if (!html || !HAS_TICKET_URL_PATTERN.test(html)) return html

  const linkedTicketRegex =
    /<a\b[^>]*href=(["'])https?:\/\/techtool-app\.vercel\.app\/tickets\/([a-z]{2,}-\d+)\1[^>]*>[\s\S]*?<\/a>/gi

  let converted = html.replace(linkedTicketRegex, (fullMatch, _quote, slug: string) => {
    if (!slug) return fullMatch
    return renderTicketBadge(slug)
  })

  converted = converted
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (!part || part.startsWith("<")) return part
      return part.replace(TICKET_URL_PATTERN, (fullMatch, slug: string) => {
        if (!slug) return fullMatch
        return renderTicketBadge(slug)
      })
    })
    .join("")

  return converted
}

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

    // Strip obvious executable vectors.
    doc
      .querySelectorAll(
        "[onclick], [onload], [onerror], [onmouseenter], [onfocus], a[href^='javascript:'], img[src^='javascript:']"
      )
      .forEach((el) => el.remove())

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
  return { __html: convertTicketUrlsToBadges(safe) }
}
