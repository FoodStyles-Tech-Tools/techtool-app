"use client"

import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { useSession } from "@client/lib/auth-client"
import { lazyComponent } from "@client/lib/lazy-component"
import { usePermissions } from "@client/hooks/use-permissions"
import { FormDialogShell } from "@client/components/ui/form-dialog-shell"
import { useUsers } from "@client/hooks/use-users"
import { useDepartments } from "@client/hooks/use-departments"
import { toast } from "@client/components/ui/toast"

const GlobalTicketDialog = lazyComponent(
  () => import("./global-ticket-dialog").then((mod) => mod.GlobalTicketDialog),
)
const TicketSearchOverlay = lazyComponent(
  () => import("./ticket-search-overlay").then((mod) => mod.TicketSearchOverlay),
)
const UserSearchOverlay = lazyComponent(
  () => import("./user-search-overlay").then((mod) => mod.UserSearchOverlay),
)
const TicketDetailDialog = lazyComponent(
  () => import("./ticket-detail-dialog").then((mod) => mod.TicketDetailDialog),
)
const ProjectForm = lazyComponent(
  () => import("@client/components/forms/project-form").then((mod) => mod.ProjectForm),
)

export function KeyboardShortcuts() {
  const { data: session, isPending } = useSession()
  const pathname = useLocation().pathname
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
  const [isUserSearchOverlayOpen, setIsUserSearchOverlayOpen] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const { flags } = usePermissions()
  const canCreateTickets = flags?.canCreateTickets ?? false
  const canCreateProjects = flags?.canCreateProjects ?? false
  const shouldLoadProjectDialogData = canCreateProjects && isProjectDialogOpen
  const { data: usersData } = useUsers({
    enabled: shouldLoadProjectDialogData,
    realtime: false,
  })
  const { departments } = useDepartments({
    enabled: shouldLoadProjectDialogData,
    realtime: false,
  })
  const isUsersPage = pathname === "/users"

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
          // If on Users page, open user search overlay, otherwise open ticket search overlay
          if (isUsersPage) {
            if (!isUserSearchOverlayOpen) {
              setIsUserSearchOverlayOpen(true)
            }
          } else {
            if (!isSearchOverlayOpen) {
              setIsSearchOverlayOpen(true)
            }
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
      if (hasOpenDialog && !isTicketDialogOpen && !isSearchOverlayOpen && !isUserSearchOverlayOpen && !isProjectDialogOpen) {
        return
      }

      const isMacTicketShortcut = isMac && e.metaKey && !e.altKey && !e.ctrlKey
      const isNonMacTicketShortcut = !isMac && altKey && !e.metaKey && !e.ctrlKey

      if ((isMacTicketShortcut || isNonMacTicketShortcut) && (e.key === "a" || e.key === "A")) {
        // Don't prevent default if in input (browser shortcuts like select all)
        if (!isInputElement) {
          e.preventDefault()
          setIsTicketDialogOpen(true)
        }
      }

      const isAltCombo = e.altKey && !e.metaKey && !e.ctrlKey
      const isMetaCombo = e.metaKey && !e.altKey && !e.ctrlKey

      if (
        (e.key === "p" || e.key === "P") &&
        (isAltCombo || isMetaCombo) &&
        canCreateProjects &&
        !isInputElement
      ) {
        e.preventDefault()
        if (!isProjectDialogOpen) {
          setIsProjectDialogOpen(true)
        }
        return
      }

      // ESC: Close dialogs/overlays
      // Note: Search overlays handle their own ESC key, so we only handle ticket/project dialogs here
      if (e.key === "Escape" && !isSearchOverlayOpen && !isUserSearchOverlayOpen) {
        if (isTicketDialogOpen) {
          e.preventDefault()
          setIsTicketDialogOpen(false)
          return
        }
        if (isProjectDialogOpen) {
          e.preventDefault()
          setIsProjectDialogOpen(false)
          return
        }
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
  }, [
    session,
    isPending,
    isTicketDialogOpen,
    isSearchOverlayOpen,
    isUserSearchOverlayOpen,
    selectedTicketId,
    isProjectDialogOpen,
    canCreateProjects,
    isUsersPage,
  ])

  const handleSelectUser = (userId: string) => {
    // Dispatch custom event to scroll to user in Users page
    const event = new CustomEvent("scrollToUser", { detail: { userId } })
    window.dispatchEvent(event)
  }

  useEffect(() => {
    const handleOpenTicketDialog = () => {
      if (!canCreateTickets) return
      setIsTicketDialogOpen(true)
    }

    window.addEventListener("open-ticket-dialog", handleOpenTicketDialog)
    return () => {
      window.removeEventListener("open-ticket-dialog", handleOpenTicketDialog)
    }
  }, [canCreateTickets])

  useEffect(() => {
    const handleOpenProjectDialog = () => {
      if (!canCreateProjects) return
      setIsProjectDialogOpen(true)
    }

    window.addEventListener("open-project-dialog", handleOpenProjectDialog)
    return () => {
      window.removeEventListener("open-project-dialog", handleOpenProjectDialog)
    }
  }, [canCreateProjects])

  // Don't render dialogs if not authenticated
  if (isPending || !session) {
    return null
  }

  return (
    <>
      {isTicketDialogOpen ? (
        <GlobalTicketDialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen} />
      ) : null}
      {isSearchOverlayOpen ? (
        <TicketSearchOverlay
          open={isSearchOverlayOpen}
          onOpenChange={setIsSearchOverlayOpen}
          onSelectTicket={(ticketId) => {
            setSelectedTicketId(ticketId)
            setIsSearchOverlayOpen(false)
          }}
        />
      ) : null}
      {isUserSearchOverlayOpen ? (
        <UserSearchOverlay
          open={isUserSearchOverlayOpen}
          onOpenChange={setIsUserSearchOverlayOpen}
          onSelectUser={handleSelectUser}
        />
      ) : null}
      {selectedTicketId ? (
        <TicketDetailDialog
          ticketId={selectedTicketId}
          open={!!selectedTicketId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTicketId(null)
            }
          }}
        />
      ) : null}
      {canCreateProjects && (
        <FormDialogShell
          open={isProjectDialogOpen}
          onOpenChange={setIsProjectDialogOpen}
          title="Create Project"
          formId="shortcut-create-project-form"
          submitLabel="Create"
        >
          {isProjectDialogOpen ? (
            <ProjectForm
              departments={departments}
              users={usersData || []}
              formId="shortcut-create-project-form"
              hideSubmitButton={true}
              onSuccess={() => {
                setIsProjectDialogOpen(false)
                toast("Project created successfully")
              }}
            />
          ) : null}
        </FormDialogShell>
      )}
    </>
  )
}


