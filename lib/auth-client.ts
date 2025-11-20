import { createAuthClient } from "better-auth/react"

// Get baseURL with proper fallbacks for both development and production
function getBaseURL(): string {
  // Prefer explicit NEXT_PUBLIC_APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // In browser, use current origin (works for both dev and production)
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Server-side fallback (shouldn't happen for client-side auth, but just in case)
  return process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
})

export const { signIn, signOut, useSession } = authClient


