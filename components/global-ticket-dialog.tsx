"use client"

import { useState, useEffect } from "react"
import { usePathname } from "@/src/compat/router"
import { FormDialogShell } from "@/components/ui/form-dialog-shell"
import { TicketForm } from "@/components/forms/ticket-form"
import { usePermissions } from "@/hooks/use-permissions"
import { useProjects } from "@/hooks/use-projects"

interface GlobalTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalTicketDialog({ open, onOpenChange }: GlobalTicketDialogProps) {
  const pathname = usePathname()
  const { flags } = usePermissions()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)

  // Extract projectId from pathname if on project detail page
  useEffect(() => {
    const projectMatch = pathname?.match(/^\/projects\/([^/]+)/)
    if (projectMatch) {
      const extractedProjectId = projectMatch[1]
      setProjectId(extractedProjectId)
    } else {
      setProjectId(null)
    }
  }, [pathname])

  const shouldLoadProjectData = open
  const { data: projectsData } = useProjects({
    enabled: shouldLoadProjectData,
    realtime: false,
  })

  const projects = projectsData || []
  const canCreate = flags?.canCreateTickets ?? false

  // Don't show dialog if user doesn't have permission
  if (!canCreate) {
    return null
  }

  const createTicketFormId = "create-ticket-form"

  return (
    <FormDialogShell
      open={open && canCreate}
      onOpenChange={(nextOpen) => {
        if (isCreatingTicket) return
        onOpenChange(nextOpen)
      }}
      title="Create Ticket"
      formId={createTicketFormId}
      submitLabel={isCreatingTicket ? "Creating..." : "Create"}
      submitDisabled={isCreatingTicket}
    >
      <TicketForm
        projectId={projectId || undefined}
        projectOptions={projects}
        formId={createTicketFormId}
        hideSubmitButton={true}
        onSubmittingChange={setIsCreatingTicket}
        onSuccess={() => {
          setIsCreatingTicket(false)
          onOpenChange(false)
        }}
      />
    </FormDialogShell>
  )
}


