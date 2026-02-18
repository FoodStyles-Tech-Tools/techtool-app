"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
    <Dialog
      open={open && canCreate}
      onOpenChange={(nextOpen) => {
        if (isCreatingTicket) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent showCloseButton={false} className="flex h-[90vh] max-w-2xl flex-col overflow-hidden gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Create Ticket</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
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
        </div>
        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreatingTicket}
          >
            Cancel
          </Button>
          <Button type="submit" form={createTicketFormId} disabled={isCreatingTicket}>
            {isCreatingTicket ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
