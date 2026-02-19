const HTML_TAG_RE = /<([a-z][a-z0-9]*)\b[^>]*>/i

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function richTextToPlainText(value: string | null | undefined): string {
  if (typeof value !== "string") return ""

  const withoutDangerous = value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")

  const withBreaks = withoutDangerous
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n")
    .replace(/<\/\s*div\s*>/gi, "\n")
    .replace(/<\/\s*li\s*>/gi, "\n")

  const noTags = withBreaks.replace(/<[^>]*>/g, " ")
  return decodeHtmlEntities(noTags).replace(/\s+/g, " ").trim()
}

export function isRichTextEmpty(value: string | null | undefined): boolean {
  if (typeof value === "string" && /<img\b[^>]*src\s*=\s*['"][^'"]+['"][^>]*>/i.test(value)) {
    return false
  }
  return richTextToPlainText(value).length === 0
}

export function normalizeRichTextInput(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return isRichTextEmpty(trimmed) ? null : trimmed
}

export function toDisplayHtml(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null

  if (HTML_TAG_RE.test(trimmed)) {
    return trimmed
  }

  return `<p>${escapeHtml(trimmed).replace(/\n/g, "<br />")}</p>`
}
