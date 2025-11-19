"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, GripVertical, Copy } from "lucide-react"
import { toast } from "@/components/ui/toast"
import { format } from "date-fns"
import { usePermissions } from "@/hooks/use-permissions"
import { useRealtimeSubscription } from "@/hooks/use-realtime"
import { useSupabaseClient } from "@/lib/supabase"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"

interface Subtask {
  id: string
  ticket_id: string
  title: string
  completed: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
  position: number
}

interface SubtasksProps {
  ticketId: string
  projectName?: string | null
  displayId?: string | null
}

export function Subtasks({ ticketId, projectName, displayId }: SubtasksProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragStartElement, setDragStartElement] = useState<HTMLElement | null>(null)
  const { hasPermission } = usePermissions()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  const fetchSubtasks = async () => {
    try {
      // Set user context for RLS (cached, only called once per session)
      await ensureUserContext(supabase, userEmail)

      const { data: subtasksData, error } = await supabase
        .from("subtasks")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching subtasks:", error)
      } else {
        setSubtasks(subtasksData || [])
      }
    } catch (error) {
      console.error("Error fetching subtasks:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ticketId) {
      fetchSubtasks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, userEmail])

  // Real-time subscription for subtasks
  useRealtimeSubscription({
    table: "subtasks",
    filter: `ticket_id=eq.${ticketId}`,
    enabled: !!ticketId,
    onInsert: (payload) => {
      const newSubtask = payload.new as Subtask
      // Only add if not already in the list (avoid duplicates from optimistic updates)
      setSubtasks((prev) => {
        if (prev.some(s => s.id === newSubtask.id)) {
          return prev
        }
        return [...prev, newSubtask].sort((a, b) => a.position - b.position)
      })
    },
    onUpdate: (payload) => {
      const updatedSubtask = payload.new as Subtask
      setSubtasks((prev) =>
        prev.map((s) => (s.id === updatedSubtask.id ? updatedSubtask : s))
      )
    },
    onDelete: (payload) => {
      const deletedId = payload.old.id as string
      setSubtasks((prev) => prev.filter((s) => s.id !== deletedId))
    },
  })

  const handleToggleComplete = async (subtask: Subtask) => {
    if (!hasPermission("tickets", "edit")) return

    const previousCompleted = subtask.completed
    const optimisticSubtasks = subtasks.map((s) =>
      s.id === subtask.id
        ? { ...s, completed: !s.completed, completed_at: !s.completed ? new Date().toISOString() : null }
        : s
    )
    setSubtasks(optimisticSubtasks)

    try {
      // Set user context for RLS
      if (userEmail) {
        await ensureUserContext(supabase, userEmail)
      }

      const { error } = await supabase
        .from("subtasks")
        .update({ 
          completed: !subtask.completed,
          completed_at: !subtask.completed ? new Date().toISOString() : null
        })
        .eq("id", subtask.id)
        .eq("ticket_id", ticketId)

      if (error) {
        setSubtasks((prev) =>
          prev.map((s) => (s.id === subtask.id ? { ...s, completed: previousCompleted } : s))
        )
        toast("Failed to update subtask", "error")
      }
      // Realtime subscription will handle the update, so we don't need to manually update state
    } catch (error) {
      console.error("Error updating subtask:", error)
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtask.id ? { ...s, completed: previousCompleted } : s))
      )
      toast("Failed to update subtask", "error")
    }
  }

  const handleStartEdit = (subtask: Subtask) => {
    if (!hasPermission("tickets", "edit")) return
    setEditingId(subtask.id)
    setEditValue(subtask.title)
  }

  const handleSaveEdit = async (subtaskId: string) => {
    if (!editValue.trim()) {
      toast("Subtask title cannot be empty", "error")
      return
    }

    const subtask = subtasks.find((s) => s.id === subtaskId)
    if (!subtask || subtask.title === editValue.trim()) {
      setEditingId(null)
      return
    }

    const previousTitle = subtask.title
    const optimisticSubtasks = subtasks.map((s) =>
      s.id === subtaskId ? { ...s, title: editValue.trim() } : s
    )
    setSubtasks(optimisticSubtasks)
    setEditingId(null)

    try {
      // Set user context for RLS
      if (userEmail) {
        await ensureUserContext(supabase, userEmail)
      }

      const { error } = await supabase
        .from("subtasks")
        .update({ title: editValue.trim() })
        .eq("id", subtaskId)
        .eq("ticket_id", ticketId)

      if (error) {
        setSubtasks((prev) =>
          prev.map((s) => (s.id === subtaskId ? { ...s, title: previousTitle } : s))
        )
        toast("Failed to update subtask", "error")
      }
      // Realtime subscription will handle the update, so we don't need to manually update state
    } catch (error) {
      console.error("Error updating subtask:", error)
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, title: previousTitle } : s))
      )
      toast("Failed to update subtask", "error")
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValue("")
  }

  const handleDelete = async (subtaskId: string) => {
    if (!hasPermission("tickets", "edit")) return

    const previousSubtasks = subtasks
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId))

    try {
      // Set user context for RLS
      if (userEmail) {
        await ensureUserContext(supabase, userEmail)
      }

      const { error } = await supabase
        .from("subtasks")
        .delete()
        .eq("id", subtaskId)
        .eq("ticket_id", ticketId)

      if (error) {
        setSubtasks(previousSubtasks)
        toast("Failed to delete subtask", "error")
      }
      // Realtime subscription will handle the delete, so we don't need to manually update state
    } catch (error) {
      console.error("Error deleting subtask:", error)
      setSubtasks(previousSubtasks)
      toast("Failed to delete subtask", "error")
    }
  }

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !hasPermission("tickets", "edit")) {
      // If no text, just close the input
      setIsAdding(false)
      setNewSubtaskTitle("")
      return
    }

    const title = newSubtaskTitle.trim()
    setNewSubtaskTitle("")
    setIsAdding(false)

    try {
      // Set user context for RLS
      if (userEmail) {
        await ensureUserContext(supabase, userEmail)
      }

      // Get the highest position for this ticket
      const { data: lastSubtask } = await supabase
        .from("subtasks")
        .select("position")
        .eq("ticket_id", ticketId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextPosition = lastSubtask ? (lastSubtask.position || 0) + 1 : 0

      const { data: subtask, error } = await supabase
        .from("subtasks")
        .insert({
          ticket_id: ticketId,
          title: title,
          position: nextPosition,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating subtask:", error)
        toast("Failed to create subtask", "error")
      }
      // Realtime subscription will handle the insert, so we don't need to manually update state
    } catch (error) {
      console.error("Error creating subtask:", error)
      toast("Failed to create subtask", "error")
    }
  }

  const handleCancelAdd = () => {
    setIsAdding(false)
    setNewSubtaskTitle("")
  }

  const handleDragStart = (e: React.DragEvent, subtaskId: string) => {
    if (!hasPermission("tickets", "edit")) {
      e.preventDefault()
      return
    }
    // Only allow drag if starting from the grip handle or the row itself (not interactive elements)
    const target = e.target as HTMLElement
    const isInteractive = target.closest('button, input, [role="checkbox"]')
    if (isInteractive && !target.closest('[data-drag-handle]')) {
      e.preventDefault()
      return
    }
    setDraggedId(subtaskId)
    setDragStartElement(target)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/html", subtaskId)
  }

  const handleDragOver = (e: React.DragEvent, subtaskId: string) => {
    if (!draggedId || draggedId === subtaskId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverId(subtaskId)
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)

    if (!draggedId || draggedId === targetId || !hasPermission("tickets", "edit")) {
      setDraggedId(null)
      return
    }

    const draggedIndex = subtasks.findIndex((s) => s.id === draggedId)
    const targetIndex = subtasks.findIndex((s) => s.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null)
      return
    }

    // Reorder subtasks optimistically
    const newSubtasks = [...subtasks]
    const [draggedItem] = newSubtasks.splice(draggedIndex, 1)
    newSubtasks.splice(targetIndex, 0, draggedItem)

    // Update positions
    const updatedSubtasks = newSubtasks.map((subtask, index) => ({
      ...subtask,
      position: index,
    }))

    setSubtasks(updatedSubtasks)
    setDraggedId(null)

    // Save new positions to server
    try {
      // Set user context for RLS
      if (userEmail) {
        await ensureUserContext(supabase, userEmail)
      }

      // Update all positions
      const updates = updatedSubtasks.map((subtask) =>
        supabase
          .from("subtasks")
          .update({ position: subtask.position })
          .eq("id", subtask.id)
          .eq("ticket_id", ticketId)
      )

      const results = await Promise.all(updates)
      const errors = results.filter((result) => result.error)

      if (errors.length > 0) {
        console.error("Error updating subtask positions:", errors)
        // Revert on error
        fetchSubtasks()
        toast("Failed to reorder subtasks", "error")
      }
      // Realtime subscription will handle the updates, so we don't need to manually update state
    } catch (error) {
      console.error("Error reordering subtasks:", error)
      fetchSubtasks()
      toast("Failed to reorder subtasks", "error")
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleCopySubtask = (subtask: Subtask) => {
    const project = projectName || "No Project"
    const ticketId = displayId || ticketId.slice(0, 8)
    const label = `[${project}] ${ticketId} Sub: ${subtask.title}`
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(label)
        .then(() => toast("Copied subtask info"))
        .catch(() => toast("Failed to copy subtask info", "error"))
    } else {
      toast("Clipboard not available", "error")
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading subtasks...</div>
  }

  const canEdit = hasPermission("tickets", "edit")

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            draggable={canEdit}
            onDragStart={(e) => handleDragStart(e, subtask.id)}
            onDragOver={(e) => handleDragOver(e, subtask.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, subtask.id)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 group hover:bg-muted/50 rounded-md p-2 -mx-2 transition-colors ${
              draggedId === subtask.id ? "opacity-50" : ""
            } ${
              dragOverId === subtask.id ? "border-t-2 border-primary" : ""
            } ${canEdit ? "cursor-move" : ""}`}
          >
            {canEdit && (
              <div 
                data-drag-handle
                className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <GripVertical className="h-4 w-4" />
              </div>
            )}
            <Checkbox
              checked={subtask.completed}
              onCheckedChange={() => handleToggleComplete(subtask)}
              disabled={!canEdit}
            />
            {editingId === subtask.id ? (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSaveEdit(subtask.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveEdit(subtask.id)
                  } else if (e.key === "Escape") {
                    handleCancelEdit()
                  }
                }}
                className="flex-1 h-8 text-sm"
                autoFocus
              />
            ) : (
              <div
                className={`flex-1 flex items-center gap-2 text-sm ${
                  subtask.completed ? "line-through text-muted-foreground" : ""
                }`}
                onDoubleClick={() => handleStartEdit(subtask)}
              >
                <span className="cursor-text">{subtask.title}</span>
                {subtask.completed_at && (
                  <span className="text-xs text-muted-foreground">
                    ({format(new Date(subtask.completed_at), "MMM d, yyyy HH:mm")})
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopySubtask(subtask)
                }}
                onMouseDown={(e) => e.stopPropagation()}
                title="Copy subtask info"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              {canEdit && editingId !== subtask.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(subtask.id)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {isAdding ? (
          <div className="flex items-center gap-2">
            <Input
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onBlur={handleAddSubtask}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddSubtask()
                } else if (e.key === "Escape") {
                  handleCancelAdd()
                }
              }}
              placeholder="Enter subtask title..."
              className="flex-1 h-8 text-sm"
              autoFocus
            />
          </div>
        ) : (
          canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add subtask
            </Button>
          )
        )}
      </div>

      {subtasks.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No subtasks yet. {canEdit && "Click 'Add subtask' to create one."}
        </p>
      )}
    </div>
  )
}

