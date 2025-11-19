import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public access to sign-in and auth API routes
  if (pathname.startsWith("/signin") || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // For all other routes, we'll check auth in the page/route itself
  // This is a simple middleware - auth checks happen in API routes and pages
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}


