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

function convertTicketUrlsToBadges(html: string): string {
  if (!html || !HAS_TICKET_URL_PATTERN.test(html)) return html

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")

    const createTicketBadgeNode = (slugRaw: string) => {
      const slug = String(slugRaw || "").toLowerCase()
      const displayId = slug.toUpperCase()
      const anchor = doc.createElement("a")
      anchor.setAttribute("data-mention-badge", "true")
      anchor.setAttribute("data-mention-type", "ticket")
      anchor.setAttribute("data-mention-label", displayId)
      anchor.setAttribute("class", "mention-pill mention-ticket")
      anchor.setAttribute("href", `/tickets/${slug}`)
      const label = doc.createElement("span")
      label.setAttribute("class", "mention-ticket-label")
      label.textContent = displayId
      anchor.appendChild(label)
      return anchor
    }

    doc.querySelectorAll("a[href]").forEach((anchor) => {
      const href = anchor.getAttribute("href") || ""
      const match = href.match(/^https?:\/\/techtool-app\.vercel\.app\/tickets\/([a-z]{2,}-\d+)\/?$/i)
      if (!match?.[1]) return
      anchor.replaceWith(createTicketBadgeNode(match[1]))
    })

    const textNodes: Text[] = []
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
    let currentNode = walker.nextNode()
    while (currentNode) {
      textNodes.push(currentNode as Text)
      currentNode = walker.nextNode()
    }

    textNodes.forEach((textNode) => {
      const parentElement = textNode.parentElement
      if (!parentElement) return
      if (parentElement.closest("a, pre, code, [data-mention-badge='true']")) return

      const textContent = textNode.nodeValue || ""
      if (!HAS_TICKET_URL_PATTERN.test(textContent)) return

      const fragment = doc.createDocumentFragment()
      let cursor = 0
      const regex = new RegExp(TICKET_URL_PATTERN.source, TICKET_URL_PATTERN.flags)
      let match: RegExpExecArray | null

      while ((match = regex.exec(textContent)) !== null) {
        const start = match.index
        const end = start + match[0].length
        const slug = match[1]
        if (!slug) continue

        if (start > cursor) {
          fragment.appendChild(doc.createTextNode(textContent.slice(cursor, start)))
        }
        fragment.appendChild(createTicketBadgeNode(slug))
        cursor = end
      }

      if (cursor < textContent.length) {
        fragment.appendChild(doc.createTextNode(textContent.slice(cursor)))
      }

      textNode.parentNode?.replaceChild(fragment, textNode)
    })

    return doc.body.innerHTML.trim()
  } catch {
    return html
  }
}

function enhanceCodeBlocks(doc: Document) {
  doc.querySelectorAll("pre").forEach((pre) => {
    const codeNode = pre.querySelector("code")
    const codeText = (codeNode?.textContent || pre.textContent || "").trimEnd()
    if (!codeText) return

    pre.classList.add("rich-code-block")

    const copyButton = doc.createElement("button")
    copyButton.setAttribute("type", "button")
    copyButton.setAttribute("data-code-copy", "true")
    copyButton.setAttribute("data-code-value", codeText)
    copyButton.className = "code-copy-button"
    copyButton.textContent = "Copy"
    pre.insertBefore(copyButton, pre.firstChild)
  })
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

    enhanceCodeBlocks(doc)

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
