export type NextRequest = Request & {
  nextUrl: URL
  cookies: {
    getAll(): Array<{ name: string; value: string }>
    set(name: string, value: string): void
  }
}

export class NextResponse extends Response {
  static json(data: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers)
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }

    return new NextResponse(JSON.stringify(data), {
      ...init,
      headers,
    })
  }

  static redirect(input: string | URL, init?: number | ResponseInit) {
    const status = typeof init === "number" ? init : (init?.status ?? 307)
    const headers = new Headers(typeof init === "number" ? undefined : init?.headers)
    headers.set("Location", input.toString())
    return new NextResponse(null, { status, headers })
  }

  static next(init?: ResponseInit) {
    return new NextResponse(null, init)
  }
}
