export class LegacyPageRedirectError extends Error {
  href: string

  constructor(href: string) {
    super(`Redirected to ${href}`)
    this.name = "LegacyPageRedirectError"
    this.href = href
  }
}

export class LegacyPageNotFoundError extends Error {
  constructor() {
    super("Route not found")
    this.name = "LegacyPageNotFoundError"
  }
}

export function redirect(href: string): never {
  throw new LegacyPageRedirectError(href)
}

export function notFound(): never {
  throw new LegacyPageNotFoundError()
}
