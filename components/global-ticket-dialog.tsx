"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { TicketForm } from "@/components/forms/ticket-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePermissions } from "@/hooks/use-permissions"
import { useProject, useProjects } from "@/hooks/use-projects"

interface GlobalTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NO_PROJECT_VALUE = "__no_project__"

export function GlobalTicketDialog({ open, onOpenChange }: GlobalTicketDialogProps) {
  const pathname = usePathname()
  const { hasPermission } = usePermissions()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(NO_PROJECT_VALUE)

  // Extract projectId from pathname if on project detail page
  useEffect(() => {
    const projectMatch = pathname?.match(/^\/projects\/([^/]+)/)
    if (projectMatch) {
      const extractedProjectId = projectMatch[1]
      setProjectId(extractedProjectId)
      setSelectedProjectId(extractedProjectId)
    } else {
      setProjectId(null)
      setSelectedProjectId(NO_PROJECT_VALUE)
    }
  }, [pathname])

  // Reset selected project when dialog closes
  useEffect(() => {
    if (!open) {
      if (projectId) {
        setSelectedProjectId(projectId)
      } else {
        setSelectedProjectId(NO_PROJECT_VALUE)
      }
    }
  }, [open, projectId])

  // Fetch project data if we have a projectId
  const { data: projectData } = useProject(projectId || "")
  const { data: projectsData } = useProjects()

  const projects = projectsData || []
  const canCreate = hasPermission("tickets", "create")

  // Don't show dialog if user doesn't have permission
  if (!canCreate) {
    return null
  }

  // Determine the effective project ID (use contextual projectId or selectedProjectId, but not NO_PROJECT_VALUE)
  const effectiveProjectId = projectId || (selectedProjectId !== NO_PROJECT_VALUE ? selectedProjectId : null)
  
  // Get the selected project name (either from URL projectId or from dropdown selection)
  const selectedProject = effectiveProjectId 
    ? (projectData?.project || projects.find(p => p.id === effectiveProjectId))
    : null

  return (
    <Dialog open={open && canCreate} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedProject
              ? `Create New Ticket - ${selectedProject.name}`
              : "Create New Ticket"}
          </DialogTitle>
        </DialogHeader>
        {!projectId && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project (Optional)</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT_VALUE}>No Project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <TicketForm
          projectId={effectiveProjectId || undefined}
          onSuccess={() => {
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

