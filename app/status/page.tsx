"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { GripVertical, Plus, Pencil, Trash2 } from "lucide-react"
import { useRequirePermission } from "@/hooks/use-require-permission"
import { useTicketStatuses } from "@/hooks/use-ticket-statuses"
import { normalizeStatusKey, type TicketStatus } from "@/lib/ticket-statuses"

type StatusFormState = {
  key: string
  label: string
  color: string
}

const DEFAULT_COLOR = "#9ca3af"

export default function StatusPage() {
  const { hasPermission: canView, loading: permissionLoading } = useRequirePermission(
    "status",
    "manage"
  )
  const { statuses, statusMap, loading, refresh, error } = useTicketStatuses({ fallback: false })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<TicketStatus | null>(null)
  const [formState, setFormState] = useState<StatusFormState>({
    key: "",
    label: "",
    color: DEFAULT_COLOR,
  })
  const [saving, setSaving] = useState(false)
  const [orderedKeys, setOrderedKeys] = useState<string[]>([])
  const [draggedKey, setDraggedKey] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const nextSortOrder = useMemo(() => {
    return statuses.length + 1
  }, [statuses])

  useEffect(() => {
    if (!statuses.length) {
      setOrderedKeys([])
      return
    }
    const nextKeys = statuses.map((status) => status.key)
    setOrderedKeys((prev) => {
      if (prev.length === 0) return nextKeys
      const missing = nextKeys.filter((key) => !prev.includes(key))
      const filtered = prev.filter((key) => nextKeys.includes(key))
      return [...filtered, ...missing]
    })
  }, [statuses])

  const openAddDialog = () => {
    setEditingStatus(null)
    setFormState({
      key: "",
      label: "",
      color: DEFAULT_COLOR,
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (status: TicketStatus) => {
    setEditingStatus(status)
    setFormState({
      key: status.key,
      label: status.label,
      color: status.color || DEFAULT_COLOR,
    })
    setIsDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingStatus(null)
    }
  }

  const handleLabelChange = (value: string) => {
    setFormState((prev) => {
      return { ...prev, label: value, key: normalizeStatusKey(value) }
    })
  }

  const handleSave = async () => {
    const trimmedLabel = formState.label.trim()
    const normalizedKey = normalizeStatusKey(trimmedLabel)
    const normalizedColor = formState.color.startsWith("#")
      ? formState.color
      : `#${formState.color}`
    const colorRegex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/

    if (!trimmedLabel) {
      toast("Label is required", "error")
      return
    }

    if (!normalizedKey) {
      toast("Key could not be generated from label", "error")
      return
    }

    if (!colorRegex.test(normalizedColor)) {
      toast("Color must be a valid hex value", "error")
      return
    }

    setSaving(true)
    try {
      const payload = {
        key: normalizedKey,
        label: trimmedLabel,
        color: normalizedColor,
        sort_order: editingStatus ? editingStatus.sort_order : nextSortOrder,
      }

      const res = await fetch(
        editingStatus
          ? `/api/ticket-statuses/${encodeURIComponent(editingStatus.key)}`
          : "/api/ticket-statuses",
        {
          method: editingStatus ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        toast(errorData.error || "Failed to save status", "error")
        return
      }

      await refresh()
      toast(editingStatus ? "Status updated" : "Status created", "success")
      setIsDialogOpen(false)
      setEditingStatus(null)
    } catch (err) {
      console.error("Failed to save status:", err)
      toast("Failed to save status", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (status: TicketStatus) => {
    if (!confirm(`Delete status "${status.label}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/ticket-statuses/${encodeURIComponent(status.key)}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        toast(errorData.error || "Failed to delete status", "error")
        return
      }

      await refresh()
      toast("Status deleted", "success")
    } catch (err) {
      console.error("Failed to delete status:", err)
      toast("Failed to delete status", "error")
    }
  }

  const orderedStatuses = useMemo(() => {
    if (!orderedKeys.length) return statuses
    const resolved = orderedKeys
      .map((key) => statusMap.get(key))
      .filter(Boolean) as TicketStatus[]
    const missing = statuses.filter((status) => !orderedKeys.includes(status.key))
    return [...resolved, ...missing]
  }, [orderedKeys, statuses, statusMap])

  if (permissionLoading || !canView) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const reorderStatuses = async (nextKeys: string[]) => {
    setOrderedKeys(nextKeys)
    try {
      const res = await fetch("/api/ticket-statuses/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: nextKeys }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        toast(errorData.error || "Failed to reorder statuses", "error")
        await refresh()
        return
      }

      await refresh()
      toast("Status order updated", "success")
    } catch (err) {
      console.error("Failed to reorder statuses:", err)
      toast("Failed to reorder statuses", "error")
      await refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Status</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage ticket statuses, colors, and ordering
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Status
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStatus ? "Edit Status" : "Add Status"}</DialogTitle>
              <DialogDescription>
                {editingStatus
                  ? "Update the label or color."
                  : "Create a new status available for tickets."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status-label">Label</Label>
                <Input
                  id="status-label"
                  value={formState.label}
                  onChange={(event) => handleLabelChange(event.target.value)}
                  placeholder="In Review"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={formState.color}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, color: event.target.value }))
                    }
                    className="h-10 w-12 p-1"
                  />
                  <Input
                    value={formState.color}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, color: event.target.value }))
                    }
                    placeholder="#9ca3af"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading statuses...</p>
      ) : error ? (
        <p className="text-sm text-destructive">Failed to load statuses.</p>
      ) : statuses.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No statuses yet. Add one to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="px-4 py-3 text-xs text-muted-foreground">
            Drag the handle to reorder statuses. Order updates are saved automatically.
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 py-2 text-xs w-10"></TableHead>
                <TableHead className="h-9 py-2 text-xs">Color</TableHead>
                <TableHead className="h-9 py-2 text-xs">Label</TableHead>
                <TableHead className="h-9 py-2 text-xs">Key</TableHead>
                <TableHead className="h-9 py-2 text-xs">Order</TableHead>
                <TableHead className="h-9 py-2 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedStatuses.map((status) => (
                <TableRow
                  key={status.key}
                  className={[
                    "hover:bg-muted/50",
                    dragOverKey === status.key && draggedKey !== status.key
                      ? "border-t-2 border-primary"
                      : "",
                  ].join(" ")}
                  onDragOver={(event) => {
                    if (!draggedKey || draggedKey === status.key) return
                    event.preventDefault()
                    setDragOverKey(status.key)
                  }}
                  onDragLeave={() => {
                    if (dragOverKey === status.key) {
                      setDragOverKey(null)
                    }
                  }}
                  onDrop={() => {
                    if (!draggedKey || draggedKey === status.key) return
                    const currentKeys = orderedKeys.length
                      ? [...orderedKeys]
                      : statuses.map((s) => s.key)
                    const fromIndex = currentKeys.indexOf(draggedKey)
                    const toIndex = currentKeys.indexOf(status.key)
                    if (fromIndex === -1 || toIndex === -1) return
                    const nextKeys = [...currentKeys]
                    const [moved] = nextKeys.splice(fromIndex, 1)
                    nextKeys.splice(toIndex, 0, moved)
                    setDraggedKey(null)
                    setDragOverKey(null)
                    void reorderStatuses(nextKeys)
                  }}
                >
                  <TableCell className="py-2 text-muted-foreground">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move"
                        setDraggedKey(status.key)
                      }}
                      onDragEnd={() => {
                        setDraggedKey(null)
                        setDragOverKey(null)
                      }}
                      aria-label={`Reorder ${status.label}`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full border border-border/60"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-xs font-mono text-muted-foreground">
                        {status.color}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-sm">{status.label}</TableCell>
                  <TableCell className="py-2 text-sm font-mono text-muted-foreground">
                    {status.key}
                  </TableCell>
                  <TableCell className="py-2 text-sm">{status.sort_order}</TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(status)}
                        aria-label={`Edit ${status.label}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(status)}
                        aria-label={`Delete ${status.label}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
