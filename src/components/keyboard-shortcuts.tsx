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
import { useTicketPreview } from "@client/features/tickets/context/ticket-preview-context"

const GlobalTicketDialog = lazyComponent(
  () => import("./global-ticket-dialog").then((mod) => mod.GlobalTicketDialog),
)
const TicketSearchOverlay = lazyComponent(
  () => import("./ticket-search-overlay").then((mod) => mod.TicketSearchOverlay),
)
const UserSearchOverlay = lazyComponent(
  () => import("./user-search-overlay").then((mod) => mod.UserSearchOverlay),
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
const SprintForm = lazyComponent(
  () => import("@client/components/forms/sprint-form").then((mod) => mod.SprintForm),
)

export function KeyboardShortcuts() {
  const { data: session, isPending } = useSession()
  const pathname = useLocation().pathname
  const navigate = useNavigate()
  const { openPreview: openTicketPreview } = useTicketPreview()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
  const [isUserSearchOverlayOpen, setIsUserSearchOverlayOpen] = useState(false)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [isEpicDialogOpen, setIsEpicDialogOpen] = useState(false)
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false)
  const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false)
  const { flags } = usePermissions()
  const canCreateTickets = flags?.canCreateTickets ?? false
  const canCreateProjects = flags?.canCreateProjects ?? false
  const canEditProjects = flags?.canEditProjects ?? false
  const canViewTickets = flags?.canViewTickets ?? false
  const canViewProjects = flags?.canViewProjects ?? false
  const canViewClockify = flags?.canViewClockify ?? false
  const canViewAssets = flags?.canViewAssets ?? false
  const canViewUsers = flags?.canViewUsers ?? false
  const canViewRoles = flags?.canViewRoles ?? false
  const canViewAuditLog = flags?.canViewAuditLog ?? false
  const canManageStatus = flags?.canManageStatus ?? false
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
    // Create actions
    if (canCreateTickets) {
      list.push({ id: "create-ticket", label: "Create ticket", keywords: "new ticket", icon: "ticket" })
    }
    if (canCreateProjects) {
      list.push({ id: "create-project", label: "Create project", keywords: "new project", icon: "project" })
    }
    if (canEditProjects) {
      list.push({ id: "create-epic", label: "Create epic", keywords: "new epic", icon: "epic" })
      list.push({ id: "create-department", label: "Create department", keywords: "new department", icon: "department" })
      list.push({ id: "create-sprint", label: "Create sprint", keywords: "new sprint", icon: "sprint" })
    }
    // Find actions
    list.push({ id: "find-ticket", label: "Find ticket", keywords: "search ticket", icon: "find-ticket" })
    list.push({ id: "find-project", label: "Find project", keywords: "search project go projects", icon: "find-project" })
    // Open module actions (permission-gated)
    if (canViewTickets) {
      list.push({ id: "open-tickets", label: "Open Tickets", keywords: "tickets go", icon: "open" })
    }
    if (canViewProjects) {
      list.push({ id: "open-projects", label: "Open Projects", keywords: "projects go", icon: "open" })
    }
    if (canViewClockify) {
      list.push({ id: "open-reports", label: "Open Reports", keywords: "reports go", icon: "open" })
      list.push({ id: "open-clockify", label: "Open Clockify", keywords: "clockify time go", icon: "open" })
    }
    if (canViewAssets) {
      list.push({ id: "open-assets", label: "Open Assets", keywords: "assets go", icon: "open" })
    }
    if (canViewUsers) {
      list.push({ id: "open-users", label: "Open Users", keywords: "users people go", icon: "open" })
    }
    if (canViewRoles) {
      list.push({ id: "open-roles", label: "Open Roles", keywords: "roles permissions go", icon: "open" })
    }
    if (canViewAuditLog) {
      list.push({ id: "open-audit-log", label: "Open Audit Log", keywords: "audit log history go", icon: "open" })
    }
    if (canManageStatus) {
      list.push({ id: "open-status", label: "Open Status", keywords: "status workspace go", icon: "open" })
    }
    if (canEditProjects) {
      list.push({ id: "open-epics", label: "Open Epics", keywords: "epics workspace go", icon: "open" })
      list.push({ id: "open-sprints", label: "Open Sprints", keywords: "sprints workspace go", icon: "open" })
    }
    return list
  }, [
    canCreateTickets,
    canCreateProjects,
    canEditProjects,
    canViewTickets,
    canViewProjects,
    canViewClockify,
    canViewAssets,
    canViewUsers,
    canViewRoles,
    canViewAuditLog,
    canManageStatus,
  ])

  const handleCommandPaletteSelect = (actionId: string) => {
    switch (actionId) {
      case "create-ticket":
        setIsTicketDialogOpen(true)
        break
      case "create-project":
        setIsProjectDialogOpen(true)
        break
      case "create-epic":
        setIsEpicDialogOpen(true)
        break
      case "create-department":
        setIsDepartmentDialogOpen(true)
        break
      case "create-sprint":
        setIsSprintDialogOpen(true)
        break
      case "find-ticket":
        setIsSearchOverlayOpen(true)
        break
      case "find-project":
        navigate("/projects")
        break
      case "open-tickets":
        navigate("/tickets")
        break
      case "open-projects":
        navigate("/projects")
        break
      case "open-reports":
        navigate("/report")
        break
      case "open-assets":
        navigate("/assets")
        break
      case "open-clockify":
        navigate("/clockify")
        break
      case "open-users":
        navigate("/users")
        break
      case "open-roles":
        navigate("/roles")
        break
      case "open-audit-log":
        navigate("/audit-log")
        break
      case "open-status":
        navigate("/status")
        break
      case "open-epics":
        navigate("/epics")
        break
      case "open-sprints":
        navigate("/sprints")
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
        !isDepartmentDialogOpen &&
        !isSprintDialogOpen
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
        if (isSprintDialogOpen) {
          e.preventDefault()
          setIsSprintDialogOpen(false)
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
    isProjectDialogOpen,
    isEpicDialogOpen,
    isDepartmentDialogOpen,
    isSprintDialogOpen,
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
  }, [isUsersPage, isSearchOverlayOpen, isUserSearchOverlayOpen, isCommandPaletteOpen])

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
          onSelectTicket={(urlSegment) => {
            setIsSearchOverlayOpen(false)
            openTicketPreview({ slug: String(urlSegment).toLowerCase() })
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
      {canEditProjects && (
        <Dialog open={isSprintDialogOpen} onOpenChange={setIsSprintDialogOpen}>
          <DialogContent showCloseButton className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Sprint</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              {isSprintDialogOpen ? (
                <SprintForm
                  onSuccess={() => {
                    setIsSprintDialogOpen(false)
                    toast("Sprint created successfully")
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


