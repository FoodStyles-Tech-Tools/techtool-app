"use client"

import { Loader2 } from "lucide-react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"

type SignOutOverlayContextValue = {
  show: () => void
  hide: () => void
}

const SignOutOverlayContext = createContext<SignOutOverlayContextValue | null>(null)

export function SignOutOverlayProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const pathname = usePathname()

  const show = useCallback(() => setVisible(true), [])
  const hide = useCallback(() => setVisible(false), [])

  useEffect(() => {
    if (visible) {
      setVisible(false)
    }
  }, [pathname, visible])

  return (
    <SignOutOverlayContext.Provider value={{ show, hide }}>
      {children}
      {visible && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-lg font-semibold tracking-wide animate-pulse">Logging you out...</p>
          </div>
        </div>
      )}
    </SignOutOverlayContext.Provider>
  )
}

export function useSignOutOverlay() {
  const context = useContext(SignOutOverlayContext)
  if (!context) {
    throw new Error("useSignOutOverlay must be used within SignOutOverlayProvider")
  }
  return context
}
