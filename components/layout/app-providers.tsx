"use client"

import dynamic from "next/dynamic"
import { ReactQueryProvider } from "@/lib/react-query"
import { AuthProvider } from "@/lib/auth-client"
import { SignOutOverlayProvider } from "@/components/signout-overlay"
import { RichTextActionsListener } from "@/components/layout/rich-text-actions-listener"
import { Toaster } from "@/components/ui/toast"

const KeyboardShortcuts = dynamic(
  () => import("@/components/keyboard-shortcuts").then((mod) => mod.KeyboardShortcuts),
  { ssr: false }
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
