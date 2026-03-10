"use client"

import {
  createElement,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { AuthChangeEvent, Provider, Session } from "@supabase/supabase-js"
import { mapSupabaseUserToSession, type AppSession } from "@/lib/auth-session"
import { getBrowserSupabaseClient } from "@/lib/supabase-browser"

type UseSessionResult = {
  data: AppSession | null
  isPending: boolean
}

type SignInOptions = {
  provider: Provider
  callbackURL?: string
}

type SignInCallbacks = {
  onRequest?: () => void
  onError?: (error: Error) => void
}

const AuthContext = createContext<UseSessionResult>({
  data: null,
  isPending: true,
})

function normalizeCallbackPath(callbackURL?: string): string {
  if (!callbackURL) return "/dashboard"
  if (!callbackURL.startsWith("/") || callbackURL.startsWith("//")) {
    return "/dashboard"
  }
  return callbackURL
}

function clearClientAuthCache() {
  if (typeof window === "undefined") return
  delete (window as typeof window & { __PERMISSIONS_CACHE__?: unknown }).__PERMISSIONS_CACHE__
  try {
    window.localStorage.removeItem("tt.permissions")
  } catch {
    // Ignore storage failures during sign out.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null)
  const [isPending, setIsPending] = useState(true)

  useEffect(() => {
    const supabase = getBrowserSupabaseClient()
    let isMounted = true

    void supabase.auth.getSession().then(
      ({ data, error }: { data: { session: Session | null }; error: Error | null }) => {
        if (!isMounted) return
        if (error) {
          console.error("Failed to read Supabase session:", error)
        }
        startTransition(() => {
          setSession(mapSupabaseUserToSession(data.session?.user))
          setIsPending(false)
        })
      }
    )

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
      startTransition(() => {
        setSession(mapSupabaseUserToSession(nextSession?.user))
        setIsPending(false)
      })
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return createElement(
    AuthContext.Provider,
    { value: { data: session, isPending } },
    children
  )
}

export function useSession(): UseSessionResult {
  return useContext(AuthContext)
}

export const signIn = {
  async social(options: SignInOptions, callbacks?: SignInCallbacks) {
    callbacks?.onRequest?.()

    try {
      const supabase = getBrowserSupabaseClient()
      const callbackPath = normalizeCallbackPath(options.callbackURL)
      const redirectBase =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const redirectTo = new URL("/auth/callback", redirectBase)
      redirectTo.searchParams.set("next", callbackPath)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: options.provider,
        options: {
          redirectTo: redirectTo.toString(),
        },
      })

      if (error) {
        throw error
      }
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error("Failed to sign in with Supabase")
      callbacks?.onError?.(normalizedError)
      throw normalizedError
    }
  },
}

export async function signOut() {
  clearClientAuthCache()
  const supabase = getBrowserSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}
