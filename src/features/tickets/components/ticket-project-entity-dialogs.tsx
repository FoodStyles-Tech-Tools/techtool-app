"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { EpicForm } from "@client/components/forms/epic-form"
import { SprintForm } from "@client/components/forms/sprint-form"

export function TicketProjectEntityDialogs({
  projectId,
  epicOpen,
  sprintOpen,
  onEpicOpenChange,
  onSprintOpenChange,
}: {
  projectId: string | null
  epicOpen: boolean
  sprintOpen: boolean
  onEpicOpenChange: (open: boolean) => void
  onSprintOpenChange: (open: boolean) => void
}) {
  return (
    <>
      <Dialog open={epicOpen} onOpenChange={onEpicOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Epic</DialogTitle>
          </DialogHeader>
          <EpicForm
            projectId={projectId}
            onSuccess={() => {
              onEpicOpenChange(false)
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={sprintOpen} onOpenChange={onSprintOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sprint</DialogTitle>
          </DialogHeader>
          <SprintForm
            onSuccess={() => {
              onSprintOpenChange(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
