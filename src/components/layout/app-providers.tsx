"use client"

import { lazyComponent } from "@client/lib/lazy-component"
import { ReactQueryProvider } from "@client/lib/react-query"
import { AuthProvider } from "@client/lib/auth-client"
import { ThemeProvider } from "@client/components/layout/theme-provider"
import { SignOutOverlayProvider } from "@client/components/signout-overlay"
import { RichTextActionsListener } from "@client/components/layout/rich-text-actions-listener"
import { Toaster } from "@client/components/ui/toast"
import { TicketPreviewProvider } from "@client/features/tickets/context/ticket-preview-context"

const KeyboardShortcuts = lazyComponent(
  () => import("@client/components/keyboard-shortcuts").then((mod) => mod.KeyboardShortcuts),
)

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ReactQueryProvider>
          <TicketPreviewProvider>
            <SignOutOverlayProvider>
              {children}
              <RichTextActionsListener />
              <Toaster />
              <KeyboardShortcuts />
            </SignOutOverlayProvider>
          </TicketPreviewProvider>
        </ReactQueryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}


