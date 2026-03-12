"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useLocation } from "react-router-dom"

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
      {visible && <div className="fixed inset-0 z-[2000] bg-black/70" aria-hidden />}
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


