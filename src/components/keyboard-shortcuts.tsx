"use client"

import { useEffect, useState, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useSession } from "@client/lib/auth-client"
import { lazyComponent } from "@client/lib/lazy-component"
import { usePermissions } from "@client/hooks/use-permissions"
import { FormDialogShell } from "@client/components/ui/form-dialog-shell"
import { useUsers } from "@client/hooks/use-users"
import { useDepartments } from "@client/hooks/use-departments"
import { toast } from "@client/components/ui/toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { CommandPalette, type CommandPaletteAction } from "@client/components/command-palette"

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
  () =>
    import("@client/features/tickets/components/ticket-detail-dialog").then(
      (mod) => mod.TicketDetailDialog
    ),
)
const ProjectForm = lazyComponent(
  () => import("@client/components/forms/project-form").then((mod) => mod.ProjectForm),
)
const EpicForm = lazyComponent(
  () => import("@client/components/forms/epic-form").then((mod) => mod.EpicForm),
)
const DepartmentForm = lazyComponent(
  () => import("@client/components/forms/department-form").then((mod) => mod.DepartmentForm),
)

export function KeyboardShortcuts() {
  const { data: session, isPending } = useSession()
  const pathname = useLocation().pathname
  const navigate = useNavigate()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
  const [isUserSearchOverlayOpen, setIsUserSearchOverlayOpen] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [isEpicDialogOpen, setIsEpicDialogOpen] = useState(false)
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false)
  const { flags } = usePermissions()
  const canCreateTickets = flags?.canCreateTickets ?? false
  const canCreateProjects = flags?.canCreateProjects ?? false
  const canEditProjects = flags?.canEditProjects ?? false
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

  const commandPaletteActions = useMemo((): CommandPaletteAction[] => {
    const list: CommandPaletteAction[] = []
    if (canCreateTickets) {
      list.push({ id: "create-ticket", label: "Create ticket", keywords: "new ticket", icon: "ticket" })
    }
    if (canCreateProjects) {
      list.push({ id: "create-project", label: "Create project", keywords: "new project", icon: "project" })
    }
    if (canEditProjects) {
      list.push({ id: "create-epic", label: "Create epic", keywords: "new epic", icon: "epic" })
      list.push({ id: "create-department", label: "Create department", keywords: "new department", icon: "department" })
    }
    list.push({ id: "find-ticket", label: "Find ticket", keywords: "search ticket", icon: "find-ticket" })
    list.push({ id: "find-project", label: "Find project", keywords: "search project go projects", icon: "find-project" })
    return list
  }, [canCreateTickets, canCreateProjects, canEditProjects])

  const handleCommandPaletteSelect = (actionId: string) => {
    switch (actionId) {
      case "create-ticket":
        if (selectedTicketId) setSelectedTicketId(null)
        setIsTicketDialogOpen(true)
        break
      case "create-project":
        if (selectedTicketId) setSelectedTicketId(null)
        setIsProjectDialogOpen(true)
        break
      case "create-epic":
        setIsEpicDialogOpen(true)
        break
      case "create-department":
        setIsDepartmentDialogOpen(true)
        break
      case "find-ticket":
        if (selectedTicketId) setSelectedTicketId(null)
        setIsSearchOverlayOpen(true)
        break
      case "find-project":
        navigate("/projects")
        break
      default:
        break
    }
  }

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

      const targetForInput = e.target as HTMLElement | null
      const isInputElement = targetForInput && (
        targetForInput.tagName === "INPUT" ||
        targetForInput.tagName === "TEXTAREA" ||
        targetForInput.tagName === "SELECT" ||
        targetForInput.isContentEditable
      )

      // CTRL+K / COMMAND+K: Open command palette (platform: Mac = Meta, Windows/Linux = Ctrl)
      if (modifierKey && (e.key === "k" || e.key === "K")) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        if (!isInputElement && !isCommandPaletteOpen) {
          setIsCommandPaletteOpen(true)
        }
        return
      }

      // CTRL+F / COMMAND+F: Open search overlay directly (quick find)
      if (modifierKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        if (!isInputElement) {
          if (selectedTicketId) setSelectedTicketId(null)
          if (isUsersPage) {
            if (!isUserSearchOverlayOpen) setIsUserSearchOverlayOpen(true)
          } else {
            if (!isSearchOverlayOpen) setIsSearchOverlayOpen(true)
          }
        }
        return
      }

      // Don't trigger if a dialog/modal is already open (except our own)
      const hasOpenDialog = document.querySelector('[role="dialog"][data-state="open"]')
      if (
        hasOpenDialog &&
        !isTicketDialogOpen &&
        !isSearchOverlayOpen &&
        !isUserSearchOverlayOpen &&
        !isProjectDialogOpen &&
        !isCommandPaletteOpen &&
        !isEpicDialogOpen &&
        !isDepartmentDialogOpen
      ) {
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

      // ESC: Close dialogs/overlays (command palette and search overlays handle their own ESC)
      if (e.key === "Escape" && !isSearchOverlayOpen && !isUserSearchOverlayOpen && !isCommandPaletteOpen) {
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
        if (isEpicDialogOpen) {
          e.preventDefault()
          setIsEpicDialogOpen(false)
          return
        }
        if (isDepartmentDialogOpen) {
          e.preventDefault()
          setIsDepartmentDialogOpen(false)
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
    isCommandPaletteOpen,
    isTicketDialogOpen,
    isSearchOverlayOpen,
    isUserSearchOverlayOpen,
    selectedTicketId,
    isProjectDialogOpen,
    isEpicDialogOpen,
    isDepartmentDialogOpen,
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

  useEffect(() => {
    const handleOpenSearchOverlay = () => {
      if (selectedTicketId) setSelectedTicketId(null)
      if (isUsersPage) {
        if (!isUserSearchOverlayOpen) setIsUserSearchOverlayOpen(true)
      } else {
        if (!isSearchOverlayOpen) setIsSearchOverlayOpen(true)
      }
    }

    const handleOpenCommandPalette = () => {
      if (!isCommandPaletteOpen) setIsCommandPaletteOpen(true)
    }

    window.addEventListener("open-search-overlay", handleOpenSearchOverlay)
    window.addEventListener("open-command-palette", handleOpenCommandPalette)
    return () => {
      window.removeEventListener("open-search-overlay", handleOpenSearchOverlay)
      window.removeEventListener("open-command-palette", handleOpenCommandPalette)
    }
  }, [isUsersPage, isSearchOverlayOpen, isUserSearchOverlayOpen, selectedTicketId, isCommandPaletteOpen])

  // Don't render dialogs if not authenticated
  if (isPending || !session) {
    return null
  }

  return (
    <>
      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        actions={commandPaletteActions}
        onSelect={handleCommandPaletteSelect}
      />
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
      {canEditProjects && (
        <Dialog open={isEpicDialogOpen} onOpenChange={setIsEpicDialogOpen}>
          <DialogContent showCloseButton className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Epic</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              {isEpicDialogOpen ? (
                <EpicForm
                  onSuccess={() => {
                    setIsEpicDialogOpen(false)
                    toast("Epic created successfully")
                  }}
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {canEditProjects && (
        <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
          <DialogContent showCloseButton className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Department</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              {isDepartmentDialogOpen ? (
                <DepartmentForm
                  onSuccess={() => {
                    setIsDepartmentDialogOpen(false)
                    toast("Department created successfully")
                  }}
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}


