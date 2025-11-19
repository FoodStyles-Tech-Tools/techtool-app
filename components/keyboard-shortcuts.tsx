"use client"

import { useEffect, useState } from "react"
import { useSession } from "@/lib/auth-client"
import { GlobalTicketDialog } from "./global-ticket-dialog"
import { TicketSearchOverlay } from "./ticket-search-overlay"
import { TicketDetailDialog } from "./ticket-detail-dialog"

export function KeyboardShortcuts() {
  const { data: session, isPending } = useSession()
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  useEffect(() => {
    // Don't set up shortcuts if not authenticated
    if (isPending || !session) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect platform (Mac uses Meta key, Windows/Linux use Ctrl)
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const modifierKey = isMac ? e.metaKey : e.ctrlKey
      const altKey = e.altKey

      // CTRL+F / COMMAND+F: Always prevent browser's default find and open our search overlay
      if (modifierKey && (e.key === "f" || e.key === "F")) {
        // Always prevent default to block browser's find dialog
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        // Don't trigger if user is typing in an input, textarea, or select
        const target = e.target as HTMLElement | null
        const isInputElement = target && (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable
        )
        
        // Only open our overlay if not in an input field
        if (!isInputElement) {
          // Close ticket detail dialog if open so the overlay can take focus
          if (selectedTicketId) {
            setSelectedTicketId(null)
          }
          if (!isSearchOverlayOpen) {
            setIsSearchOverlayOpen(true)
          }
        }
        return
      }

      // Don't trigger if user is typing in an input, textarea, or select
      const target = e.target as HTMLElement
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable

      // Don't trigger if a dialog/modal is already open (except our own)
      // Check if there are any open dialogs by looking for data-state="open" on dialog elements
      const hasOpenDialog = document.querySelector('[role="dialog"][data-state="open"]')
      if (hasOpenDialog && !isTicketDialogOpen && !isSearchOverlayOpen) {
        return
      }

      // ALT+A / OPTION+A: Open ticket creation dialog
      if (altKey && (e.key === "a" || e.key === "A")) {
        // Don't prevent default if in input (browser shortcuts like select all)
        if (!isInputElement) {
          e.preventDefault()
          setIsTicketDialogOpen(true)
        }
      }

      // ESC: Close dialogs/overlays
      // Note: Search overlay handles its own ESC key, so we only handle ticket dialog here
      if (e.key === "Escape" && isTicketDialogOpen && !isSearchOverlayOpen) {
        // Only handle ESC for ticket dialog if search overlay is not open
        // (search overlay handles its own ESC)
        e.preventDefault()
        setIsTicketDialogOpen(false)
      }
    }

    // Use capture phase to catch the event before it reaches other handlers
    // Also attach to window to ensure we catch events even when focus is lost
    document.addEventListener("keydown", handleKeyDown, true)
    window.addEventListener("keydown", handleKeyDown, true)

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      window.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [session, isPending, isTicketDialogOpen, isSearchOverlayOpen, selectedTicketId])

  // Don't render dialogs if not authenticated
  if (isPending || !session) {
    return null
  }

  return (
    <>
      <GlobalTicketDialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen} />
      <TicketSearchOverlay 
        open={isSearchOverlayOpen} 
        onOpenChange={setIsSearchOverlayOpen}
        onSelectTicket={(ticketId) => {
          setSelectedTicketId(ticketId)
          setIsSearchOverlayOpen(false)
        }}
      />
      <TicketDetailDialog
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicketId(null)
          }
        }}
      />
    </>
  )
}

