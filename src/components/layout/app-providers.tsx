"use client"

import { lazyComponent } from "@lib/lazy-component"
import { ReactQueryProvider } from "@lib/react-query"
import { AuthProvider } from "@lib/auth-client"
import { SignOutOverlayProvider } from "@client/components/signout-overlay"
import { RichTextActionsListener } from "@client/components/layout/rich-text-actions-listener"
import { Toaster } from "@client/components/ui/toast"

const KeyboardShortcuts = lazyComponent(
  () => import("@client/components/keyboard-shortcuts").then((mod) => mod.KeyboardShortcuts),
)

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ReactQueryProvider>
        <SignOutOverlayProvider>
          {children}
          <RichTextActionsListener />
          <Toaster />
          <KeyboardShortcuts />
        </SignOutOverlayProvider>
      </ReactQueryProvider>
    </AuthProvider>
  )
}


