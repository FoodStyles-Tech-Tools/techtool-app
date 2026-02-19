/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest"
import { sanitizeHtml, getSanitizedHtmlProps } from "./sanitize-html"

describe("sanitizeHtml", () => {
  it("returns null for null or undefined", () => {
    expect(sanitizeHtml(null)).toBeNull()
    expect(sanitizeHtml(undefined)).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(sanitizeHtml("")).toBeNull()
    expect(sanitizeHtml("   ")).toBeNull()
  })

  it("strips script tags", () => {
    const html = '<p>Hello</p><script>alert("xss")</script>'
    const result = sanitizeHtml(html)
    expect(result).not.toContain("script")
    expect(result).not.toContain("alert")
  })

  it("strips style and iframe", () => {
    const html = "<p>Hi</p><style>.x{}</style><iframe src='evil'></iframe>"
    const result = sanitizeHtml(html)
    expect(result).not.toContain("style")
    expect(result).not.toContain("iframe")
  })

  it("allows safe tags like p and strong", () => {
    const html = "<p>Hello <strong>world</strong></p>"
    const result = sanitizeHtml(html)
    expect(result).toContain("Hello")
    expect(result).toContain("world")
  })
})

describe("getSanitizedHtmlProps", () => {
  it("returns null for empty input", () => {
    expect(getSanitizedHtmlProps(null)).toBeNull()
    expect(getSanitizedHtmlProps("")).toBeNull()
  })

  it("returns { __html: string } for valid content", () => {
    const props = getSanitizedHtmlProps("<p>Safe</p>")
    expect(props).toEqual({ __html: expect.any(String) })
    expect(props!.__html).toContain("Safe")
  })

  it("converts plain ticket url text to mention badge link", () => {
    const props = getSanitizedHtmlProps("<p>https://techtool-app.vercel.app/tickets/hrb-1377</p>")
    expect(props).toBeTruthy()
    expect(props!.__html).toContain('data-mention-badge="true"')
    expect(props!.__html).toContain('href="/tickets/hrb-1377"')
    expect(props!.__html).toContain("HRB-1377")
  })

  it("converts ticket anchor url to mention badge link", () => {
    const props = getSanitizedHtmlProps(
      '<p><a href="https://techtool-app.vercel.app/tickets/hrb-2001">Ticket link</a></p>'
    )
    expect(props).toBeTruthy()
    expect(props!.__html).toContain('data-mention-badge="true"')
    expect(props!.__html).toContain('href="/tickets/hrb-2001"')
    expect(props!.__html).toContain("HRB-2001")
  })
})
