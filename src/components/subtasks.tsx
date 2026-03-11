"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Input } from "@client/components/ui/input"
import { Button } from "@client/components/ui/button"
import { DataState } from "@client/components/ui/data-state"
import { usePermissions } from "@client/hooks/use-permissions"
import { useCreateTicket, useTickets, useUpdateTicket } from "@client/features/tickets/hooks/use-tickets"
import { useRealtimeSubscription } from "@client/hooks/use-realtime"
import { useUsers } from "@client/hooks/use-users"
import { toast } from "@client/components/ui/toast"
import { TicketPrioritySelect } from "@client/components/ticket-priority-select"
import { TicketStatusSelect } from "@client/components/ticket-status-select"
import { ASSIGNEE_ALLOWED_ROLES } from "@shared/ticket-constants"
import { isDoneStatus } from "@shared/ticket-statuses"
import { selectStyleInputSmPx2 } from "@client/lib/form-styles"

interface SubtasksProps {
  ticketId: string
  projectName?: string | null
  displayId?: string | null
  projectId?: string | null
  allowSqaStatuses?: boolean
  allowCreate?: boolean
}

const UNASSIGNED_VALUE = "unassigned"
const subtaskSelectClassName = selectStyleInputSmPx2

export function Subtasks({
  ticketId,
  projectName,
  displayId,
  projectId,
  allowSqaStatuses = true,
  allowCreate = true,
}: SubtasksProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { flags } = usePermissions()
  const canEditTickets = flags?.canEditTickets ?? false
  const queryClient = useQueryClient()
  const { data: usersData } = useUsers({ realtime: false })
  const createTicket = useCreateTicket()
  const updateTicket = useUpdateTicket()

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

  const users = useMemo(() => usersData || [], [usersData])
  const assigneeEligibleUsers = useMemo(
    () =>
      users.filter((user) =>
        user.role ? ASSIGNEE_ALLOWED_ROLES.has(user.role.toLowerCase()) : false
      ),
    [users]
  )

  const subtasks = useMemo(
    () =>
      [...subtasksData]
        .filter((ticket) => ticket.type === "subtask")
        .sort(
          (left, right) =>
            new Date(left.createdAt ?? 0).getTime() -
            new Date(right.createdAt ?? 0).getTime()
        ),
    [subtasksData]
  )

  const doneCount = subtasks.filter((ticket) => isDoneStatus(ticket.status)).length
  const donePercent = subtasks.length ? Math.round((doneCount / subtasks.length) * 100) : 0

  const handleCreateSubtask = async () => {
    if (!canEditTickets || creating || !allowCreate) return
    const title = newSubtaskTitle.trim()
    if (!title) return

    setCreating(true)
    try {
      await createTicket.mutateAsync({
        title,
        type: "subtask",
        status: "open",
        priority: "medium",
        parentTicketId: ticketId,
        projectId: projectId || undefined,
      })
      setNewSubtaskTitle("")
      toast("Subtask ticket created")
    } catch (error: any) {
      toast(error?.message || "Failed to create subtask ticket", "error")
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateField = async (
    subtaskId: string,
    field: "priority" | "status" | "assigneeId",
    value: string | null
  ) => {
    if (!canEditTickets) return
    setUpdatingId(subtaskId)
    try {
      const body: Record<string, any> = { [field]: value }
      await updateTicket.mutateAsync({ id: subtaskId, ...body })
      toast("Subtask updated")
    } catch (error: any) {
      toast(error?.message || "Failed to update subtask", "error")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {(displayId || "").toUpperCase()} {projectName ? `• ${projectName}` : ""}
        </p>
        <p className="text-xs text-slate-500">{donePercent}% Done</p>
      </div>

      <DataState
        loading={isLoading}
        isEmpty={!isLoading && subtasks.length === 0}
        loadingTitle="Loading subtasks"
        loadingDescription="Subtask tickets are being prepared."
        emptyTitle="No subtask tickets yet"
        emptyDescription="Create subtasks here to break this work into smaller pieces."
      >
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="grid grid-cols-[1.7fr_0.8fr_1fr_1fr] bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
            <div>Work</div>
            <div>Priority</div>
            <div>Assignee</div>
            <div>Status</div>
          </div>

          <div className="divide-y divide-slate-200">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="grid grid-cols-[1.7fr_0.8fr_1fr_1fr] items-center gap-2 px-3 py-2"
              >
                <Link
                  to={`/tickets/${String(subtask.displayId || subtask.id).toLowerCase()}`}
                  className="min-w-0 truncate text-sm hover:underline"
                >
                  {(subtask.displayId || subtask.id.slice(0, 8)).toUpperCase()} {subtask.title}
                </Link>
                <TicketPrioritySelect
                  value={subtask.priority}
                  onValueChange={(value) => handleUpdateField(subtask.id, "priority", value)}
                  disabled={!canEditTickets || updatingId === subtask.id}
                  triggerClassName="h-8 w-full"
                />
                <select
                  value={subtask.assignee?.id || UNASSIGNED_VALUE}
                  onChange={(event) =>
                    handleUpdateField(
                      subtask.id,
                      "assigneeId",
                      event.target.value === UNASSIGNED_VALUE ? null : event.target.value
                    )
                  }
                  disabled={!canEditTickets || updatingId === subtask.id}
                  className={subtaskSelectClassName}
                >
                  <option value={UNASSIGNED_VALUE}>Unassigned</option>
                  {assigneeEligibleUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
                <TicketStatusSelect
                  value={subtask.status}
                  onValueChange={(value) => handleUpdateField(subtask.id, "status", value)}
                  disabled={!canEditTickets || updatingId === subtask.id}
                  allowSqaStatuses={allowSqaStatuses}
                  triggerClassName="h-8 w-full"
                />
              </div>
            ))}
          </div>
        </div>
      </DataState>

      {canEditTickets && allowCreate ? (
        <div className="flex items-center gap-2">
          <Input
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void handleCreateSubtask()
              }
            }}
            placeholder="Create subtask ticket..."
            className="h-8"
            disabled={creating}
          />
          <Button
            size="sm"
            className="h-8"
            onClick={handleCreateSubtask}
            disabled={!newSubtaskTitle.trim() || creating}
          >
            Add
          </Button>
        </div>
      ) : null}
      {canEditTickets && !allowCreate ? (
        <p className="text-xs text-slate-500">Subtask tickets cannot contain subtasks.</p>
      ) : null}
    </div>
  )
}


