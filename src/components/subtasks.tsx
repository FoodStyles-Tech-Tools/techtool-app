"use client"

import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { PlusIcon } from "@heroicons/react/20/solid"
import { Button } from "@client/components/ui/button"
import { DataState } from "@client/components/ui/data-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { LoadingIndicator } from "@client/components/ui/loading-indicator"
import { CreateSubtaskDialog } from "@client/components/create-subtask-dialog"
import { usePermissions } from "@client/hooks/use-permissions"
import { useTickets } from "@client/features/tickets/hooks/use-tickets"
import { useUpdateTicket } from "@client/features/tickets/hooks/use-ticket-mutations"
import { useTicketPreview } from "@client/features/tickets/context/ticket-preview-context"
import { useRealtimeSubscription } from "@client/hooks/use-realtime"
import { useTicketStatuses } from "@client/hooks/use-ticket-statuses"
import { StatusPill } from "@client/components/tickets/status-pill"
import { PriorityPill } from "@client/components/tickets/priority-pill"
import { isDoneStatus, normalizeStatusKey, formatStatusLabel } from "@shared/ticket-statuses"

interface SubtasksProps {
  ticketId: string
  projectName?: string | null
  displayId?: string | null
  projectId?: string | null
  /** Parent ticket title for "Create Subtask" modal header */
  parentTitle?: string
  /** Parent ticket department id so subtask follows parent */
  parentDepartmentId?: string | null
  /** Parent ticket reporter id; subtask reporter defaults to this (required) */
  parentRequestedById?: string | null
  allowSqaStatuses?: boolean
  allowCreate?: boolean
  /** Optional initial subtasks from ticket detail relations (for legacy data) */
  initialSubtasks?: {
    id: string
    displayId: string | null
    title: string
    status: string
    type: string | null
    priority?: string
    assigneeName?: string | null
  }[]
}

export function Subtasks({
  ticketId,
  projectName,
  displayId,
  projectId,
  parentTitle = "",
  parentDepartmentId,
  parentRequestedById,
  allowSqaStatuses = true,
  allowCreate = true,
  initialSubtasks,
}: SubtasksProps) {
  const { openPreview } = useTicketPreview()
  const [createSubtaskOpen, setCreateSubtaskOpen] = useState(false)
  const [assigningSubtaskId, setAssigningSubtaskId] = useState<string | null>(null)
  const [optimisticAssignees, setOptimisticAssignees] = useState<Record<string, { name: string | null; email: string }>>({})
  const { user, flags } = usePermissions()
  const canEditTickets = flags?.canEditTickets ?? false
  const updateTicket = useUpdateTicket()
  const queryClient = useQueryClient()
  const { statusMap } = useTicketStatuses({ realtime: false })

  useRealtimeSubscription({
    table: "tickets",
    filter: `parent_ticket_id=eq.${ticketId}`,
    enabled: !!ticketId,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
  })

  const { data: subtasksData = [], isLoading } = useTickets({
    parentTicketId: ticketId,
    excludeSubtasks: false,
    enabled: !!ticketId,
    realtime: false,
  })

  const subtasks = useMemo(
    () =>
      [...subtasksData].sort(
        (left, right) =>
          new Date(left.createdAt ?? 0).getTime() -
          new Date(right.createdAt ?? 0).getTime()
      ),
    [subtasksData]
  )

  const hasApiSubtasks = subtasks.length > 0
  const fallbackSubtasks = !hasApiSubtasks ? initialSubtasks || [] : []

  const doneCount = subtasks.filter((ticket) => isDoneStatus(ticket.status)).length
  const donePercent = subtasks.length ? Math.round((doneCount / subtasks.length) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {(displayId || "").toUpperCase()} {projectName ? `• ${projectName}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">{donePercent}% Done</p>
      </div>

      <DataState
        loading={isLoading}
        isEmpty={!isLoading && subtasks.length === 0 && fallbackSubtasks.length === 0}
        loadingTitle="Loading subtasks"
        loadingDescription="Subtask tickets are being prepared."
        emptyTitle="No subtask tickets yet"
        emptyDescription="Create subtasks here to break this work into smaller pieces."
      >
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="grid grid-cols-[1.7fr_1fr_0.8fr_1fr] bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
            <div>Work</div>
            <div>Assignee</div>
            <div>Priority</div>
            <div>Status</div>
          </div>

          <div className="divide-y divide-border">
            {hasApiSubtasks
              ? subtasks.map((subtask) => {
                  const statusInfo = statusMap.get(normalizeStatusKey(subtask.status))
                  const optimisticAssignee = optimisticAssignees[subtask.id]
                  const assigneeLabel =
                    optimisticAssignee?.name ||
                    optimisticAssignee?.email ||
                    subtask.assignee?.name ||
                    subtask.assignee?.email ||
                    "Unassigned"
                  return (
                    <div
                      key={subtask.id}
                      className="grid grid-cols-[1.7fr_1fr_0.8fr_1fr] items-center gap-2 px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          openPreview({
                            ticketId: subtask.id,
                            slug: String(subtask.displayId || subtask.id).toLowerCase(),
                          })
                        }
                        className="min-w-0 truncate text-left text-sm text-primary underline"
                      >
                        {(subtask.displayId || subtask.id.slice(0, 8)).toUpperCase()} {subtask.title}
                      </button>
                      <div className="text-sm text-foreground">
                        {subtask.assignee || optimisticAssignee ? (
                          assigneeLabel
                        ) : user ? (
                          <button
                            type="button"
                            className="whitespace-nowrap text-xs text-primary underline disabled:opacity-50"
                            onClick={() => {
                              setAssigningSubtaskId(subtask.id)
                              updateTicket.mutate(
                                {
                                  id: subtask.id,
                                  assigneeId: user.id,
                                },
                                {
                                  onSuccess: () => {
                                    setOptimisticAssignees((current) => ({
                                      ...current,
                                      [subtask.id]: { name: user.name, email: user.email },
                                    }))
                                  },
                                  onError: () => {
                                    setOptimisticAssignees((current) => {
                                      const next = { ...current }
                                      delete next[subtask.id]
                                      return next
                                    })
                                  },
                                  onSettled: () => {
                                    setAssigningSubtaskId(null)
                                  },
                                }
                              )
                            }}
                            disabled={!canEditTickets || updateTicket.isPending}
                          >
                            Assign to me
                          </button>
                        ) : (
                          "Unassigned"
                        )}
                      </div>
                      <div className="text-sm text-foreground">
                        <PriorityPill priority={subtask.priority} />
                      </div>
                      <div className="py-1">
                        {statusInfo ? (
                          <StatusPill label={statusInfo.label} color={statusInfo.color} />
                        ) : (
                          <span className="text-xs text-muted-foreground capitalize">
                            {formatStatusLabel(subtask.status)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              : fallbackSubtasks.map((subtask) => {
                  const statusInfo = statusMap.get(normalizeStatusKey(subtask.status))
                  const optimisticAssignee = optimisticAssignees[subtask.id]
                  const assigneeLabel =
                    optimisticAssignee?.name ||
                    optimisticAssignee?.email ||
                    subtask.assigneeName ||
                    "Unassigned"
                  return (
                  <div
                    key={subtask.id}
                    className="grid grid-cols-[1.7fr_1fr_0.8fr_1fr] items-center gap-2 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openPreview({
                          ticketId: subtask.id,
                          slug: String(subtask.displayId || subtask.id).toLowerCase(),
                        })
                      }
                      className="min-w-0 truncate text-left text-sm text-primary underline"
                    >
                      {(subtask.displayId || subtask.id.slice(0, 8)).toUpperCase()} {subtask.title}
                    </button>
                    <div className="text-sm text-foreground">
                      {subtask.assigneeName || optimisticAssignee ? (
                        assigneeLabel
                      ) : user ? (
                        <button
                          type="button"
                          className="whitespace-nowrap text-xs text-primary underline disabled:opacity-50"
                          onClick={() => {
                            setAssigningSubtaskId(subtask.id)
                            updateTicket.mutate(
                              {
                                id: subtask.id,
                                assigneeId: user.id,
                              },
                              {
                                onSuccess: () => {
                                  setOptimisticAssignees((current) => ({
                                    ...current,
                                    [subtask.id]: { name: user.name, email: user.email },
                                  }))
                                },
                                onError: () => {
                                  setOptimisticAssignees((current) => {
                                    const next = { ...current }
                                    delete next[subtask.id]
                                    return next
                                  })
                                },
                                onSettled: () => {
                                  setAssigningSubtaskId(null)
                                },
                              }
                            )
                          }}
                          disabled={!canEditTickets || updateTicket.isPending}
                        >
                          Assign to me
                        </button>
                      ) : (
                        "Unassigned"
                      )}
                    </div>
                    <div className="text-sm text-foreground">
                      {subtask.priority ? (
                        <PriorityPill priority={subtask.priority} />
                      ) : (
                        "N/A"
                      )}
                    </div>
                    <div className="py-1">
                      {statusInfo ? (
                        <StatusPill label={statusInfo.label} color={statusInfo.color} />
                      ) : (
                        <span className="text-xs text-muted-foreground capitalize">
                          {formatStatusLabel(subtask.status)}
                        </span>
                      )}
                    </div>
                  </div>
                )})}
          </div>
        </div>
      </DataState>
      <Dialog open={!!assigningSubtaskId} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assigning subtask</DialogTitle>
            <DialogDescription>
              Please wait while we assign this subtask to you.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <LoadingIndicator variant="block" label="Saving assignee..." />
          </div>
        </DialogContent>
      </Dialog>

      {canEditTickets && allowCreate ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setCreateSubtaskOpen(true)}
          >
            <PlusIcon className="h-4 w-4" />
            Add subtask
          </Button>
          <CreateSubtaskDialog
            open={createSubtaskOpen}
            onOpenChange={setCreateSubtaskOpen}
            parentTicketId={ticketId}
            parentDisplayId={displayId ?? null}
            parentTitle={parentTitle}
            projectId={projectId ?? null}
            departmentId={parentDepartmentId ?? null}
            parentRequestedById={parentRequestedById ?? null}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["tickets"] })
            }}
          />
        </>
      ) : null}
      {canEditTickets && !allowCreate ? (
        <p className="text-xs text-muted-foreground">Subtask tickets cannot contain subtasks.</p>
      ) : null}
    </div>
  )
}


