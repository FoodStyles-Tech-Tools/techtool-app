"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { Loader2 } from "lucide-react"

type SignOutOverlayContextValue = {
  show: () => void
  hide: () => void
}

const SignOutOverlayContext = createContext<SignOutOverlayContextValue | null>(null)

export function SignOutOverlayProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const location = useLocation()

  const show = useCallback(() => setVisible(true), [])
  const hide = useCallback(() => setVisible(false), [])

  useEffect(() => {
    if (visible) {
      setVisible(false)
    }
  }, [location.pathname, visible])

  return (
    <SignOutOverlayContext.Provider value={{ show, hide }}>
      {children}
      {visible && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white px-5 py-2.5 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            <span className="text-sm text-slate-600">Logging you out...</span>
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


