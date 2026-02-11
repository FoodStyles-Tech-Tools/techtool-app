"use client"

import { ReactQueryProvider } from "@/lib/react-query"
import { ThemeProvider } from "@/components/theme-provider"
import { SignOutOverlayProvider } from "@/components/signout-overlay"
import { Toaster } from "@/components/ui/toast"
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <ThemeProvider defaultTheme="system" storageKey="techtool-theme">
        <SignOutOverlayProvider>
          {children}
          <Toaster />
          <KeyboardShortcuts />
        </SignOutOverlayProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  )
}
