"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePermissions } from "@/hooks/use-permissions"
import { useCreateTicket, useUpdateTicket } from "@/hooks/use-tickets"
import { useRealtimeSubscription } from "@/hooks/use-realtime"
import { useUsers } from "@/hooks/use-users"
import { toast } from "@/components/ui/toast"
import { TicketPrioritySelect } from "@/components/ticket-priority-select"
import { TicketStatusSelect } from "@/components/ticket-status-select"
import { UserSelectItem, UserSelectValue } from "@/components/user-select-item"
import { ASSIGNEE_ALLOWED_ROLES } from "@/lib/ticket-constants"
import { isDoneStatus } from "@/lib/ticket-statuses"
import { useSupabaseClient } from "@/lib/supabase-client"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"

interface SubtasksProps {
  ticketId: string
  projectName?: string | null
  displayId?: string | null
  projectId?: string | null
  allowSqaStatuses?: boolean
  allowCreate?: boolean
}

const UNASSIGNED_VALUE = "unassigned"

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
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  const queryClient = useQueryClient()
  const { data: usersData } = useUsers({ realtime: false })
  const createTicket = useCreateTicket()
  const updateTicket = useUpdateTicket()

  useRealtimeSubscription({
    table: "tickets",
    filter: `parent_ticket_id=eq.${ticketId}`,
    enabled: !!ticketId,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-subtasks", ticketId] })
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-subtasks", ticketId] })
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-subtasks", ticketId] })
    },
  })

  const { data: subtasksData = [], isLoading } = useQuery({
    queryKey: ["ticket-subtasks", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      await ensureUserContext(supabase, userEmail)
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          display_id,
          title,
          status,
          priority,
          type,
          created_at,
          assignee:users!tickets_assignee_id_fkey(id, name, email)
        `)
        .eq("parent_ticket_id", ticketId)
        .eq("type", "subtask")
        .order("created_at", { ascending: true })

      if (error) throw error
      return (data || []).map((row: any) => ({
        ...row,
        assignee: Array.isArray(row.assignee) ? row.assignee[0] || null : row.assignee || null,
      }))
    },
    staleTime: 30 * 1000,
  })

  const users = useMemo(() => usersData || [], [usersData])
  const assigneeEligibleUsers = useMemo(
    () => users.filter((user) => (user.role ? ASSIGNEE_ALLOWED_ROLES.has(user.role.toLowerCase()) : false)),
    [users]
  )

  const subtasks = useMemo(() => subtasksData, [subtasksData])

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
        parent_ticket_id: ticketId,
        project_id: projectId || undefined,
      })
      setNewSubtaskTitle("")
      toast("Subtask ticket created")
    } catch (error: any) {
      toast(error?.message || "Failed to create subtask ticket", "error")
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateField = async (subtaskId: string, field: "priority" | "status" | "assignee_id", value: string | null) => {
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

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading subtasks...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {(displayId || "").toUpperCase()} {projectName ? `• ${projectName}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">{donePercent}% Done</p>
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="grid grid-cols-[1.7fr_0.8fr_1fr_1fr] bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          <div>Work</div>
          <div>Priority</div>
          <div>Assignee</div>
          <div>Status</div>
        </div>

        {subtasks.length === 0 ? (
          <div className="px-3 py-3 text-sm text-muted-foreground">No subtask tickets yet.</div>
        ) : (
          <div className="divide-y">
            {subtasks.map((subtask) => (
              <div key={subtask.id} className="grid grid-cols-[1.7fr_0.8fr_1fr_1fr] items-center gap-2 px-3 py-2">
                <Link
                  href={`/tickets/${String(subtask.display_id || subtask.id).toLowerCase()}`}
                  className="min-w-0 truncate text-sm hover:underline"
                >
                  {(subtask.display_id || subtask.id.slice(0, 8)).toUpperCase()} {subtask.title}
                </Link>
                <TicketPrioritySelect
                  value={subtask.priority}
                  onValueChange={(value) => handleUpdateField(subtask.id, "priority", value)}
                  disabled={!canEditTickets || updatingId === subtask.id}
                  triggerClassName="h-7 w-full"
                />
                <Select
                  value={subtask.assignee?.id || UNASSIGNED_VALUE}
                  onValueChange={(value) =>
                    handleUpdateField(subtask.id, "assignee_id", value === UNASSIGNED_VALUE ? null : value)
                  }
                  disabled={!canEditTickets || updatingId === subtask.id}
                >
                  <SelectTrigger className="h-7 w-full relative overflow-hidden">
                    {subtask.assignee?.id ? (
                      <div className="absolute left-3 right-8 top-0 bottom-0 flex items-center overflow-hidden">
                        <UserSelectValue
                          users={assigneeEligibleUsers}
                          value={subtask.assignee.id}
                          placeholder="Unassigned"
                          unassignedValue={UNASSIGNED_VALUE}
                          unassignedLabel="Unassigned"
                        />
                      </div>
                    ) : (
                      <SelectValue placeholder="Unassigned" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                    {assigneeEligibleUsers.map((user) => (
                      <UserSelectItem key={user.id} user={user} value={user.id} />
                    ))}
                  </SelectContent>
                </Select>
                <TicketStatusSelect
                  value={subtask.status}
                  onValueChange={(value) => handleUpdateField(subtask.id, "status", value)}
                  disabled={!canEditTickets || updatingId === subtask.id}
                  allowSqaStatuses={allowSqaStatuses}
                  triggerClassName="h-7 w-full"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {canEditTickets && allowCreate && (
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
          <Button size="sm" className="h-8" onClick={handleCreateSubtask} disabled={!newSubtaskTitle.trim() || creating}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      )}
      {canEditTickets && !allowCreate ? (
        <p className="text-xs text-muted-foreground">Subtask tickets cannot contain subtasks.</p>
      ) : null}
    </div>
  )
}
