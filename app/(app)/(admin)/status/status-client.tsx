"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/ui/page-header"
import { EntityPageLayout } from "@/components/ui/entity-page-layout"
import { DataState } from "@/components/ui/data-state"
import { EntityTableShell } from "@/components/ui/entity-table-shell"
import { FormDialogShell } from "@/components/ui/form-dialog-shell"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { normalizeStatusKey, type TicketStatus } from "@/lib/ticket-statuses"

type StatusFormState = {
  key: string
  label: string
  color: string
}

const DEFAULT_COLOR = "#9ca3af"

type StatusClientProps = {
  initialStatuses: TicketStatus[]
}

export default function StatusClient({ initialStatuses }: StatusClientProps) {
  const [statuses, setStatuses] = useState<TicketStatus[]>(initialStatuses)
  const [statusMap, setStatusMap] = useState(() => new Map(initialStatuses.map((status) => [status.key, status])))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<TicketStatus | null>(null)
  const [formState, setFormState] = useState<StatusFormState>({
    key: "",
    label: "",
    color: DEFAULT_COLOR,
  })
  const [saving, setSaving] = useState(false)
  const [deletingStatus, setDeletingStatus] = useState<TicketStatus | null>(null)
  const [orderedKeys, setOrderedKeys] = useState<string[]>([])
  const [draggedKey, setDraggedKey] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const nextSortOrder = useMemo(() => {
    return statuses.length + 1
  }, [statuses])

  useEffect(() => {
    setStatuses(initialStatuses)
  }, [initialStatuses])

  useEffect(() => {
    setStatusMap(new Map(statuses.map((status) => [status.key, status])))
  }, [statuses])

  const refreshStatuses = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/ticket-statuses")
      const data = await res.json().catch(() => null)
      if (res.ok && data?.statuses) {
        setStatuses(data.statuses)
        setError(null)
      } else {
        setError(data?.error || "Failed to refresh statuses")
      }
    } finally {
      setLoading(false)
    }
  }

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

      await refreshStatuses()
      toast(editingStatus ? "Status updated" : "Status created", "success")
      setIsDialogOpen(false)
      setEditingStatus(null)
    } catch (err) {
      console.error("Failed to save status:", err)
      toast("Failed to save status", "error")
    } finally {
      setLoading(false)
      setSaving(false)
    }
  }

  const handleDelete = async (status: TicketStatus) => {
    try {
      const res = await fetch(`/api/ticket-statuses/${encodeURIComponent(status.key)}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        toast(errorData.error || "Failed to delete status", "error")
        return
      }

      await refreshStatuses()
      toast("Status deleted", "success")
    } catch (err) {
      console.error("Failed to delete status:", err)
      toast("Failed to delete status", "error")
    } finally {
      setLoading(false)
      setDeletingStatus(null)
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
        await refreshStatuses()
        return
      }

      await refreshStatuses()
      toast("Status order updated", "success")
    } catch (err) {
      console.error("Failed to reorder statuses:", err)
      toast("Failed to reorder statuses", "error")
      await refreshStatuses()
    } finally {
      setLoading(false)
    }
  }

  return (
    <EntityPageLayout
      header={
        <PageHeader
          title="Status"
          description="Manage the global ticket workflow states."
          actions={
            <Button type="button" onClick={openAddDialog}>
              Create Status
            </Button>
          }
        />
      }
    >
      <DataState
        loading={loading}
        error={error ? "Failed to load statuses." : null}
        isEmpty={!loading && statuses.length === 0}
        emptyTitle="No statuses yet"
        emptyDescription="Add a status to get started."
        loadingTitle="Loading statuses"
        loadingDescription="Please wait while statuses are loaded."
      >
        <EntityTableShell>
          <div className="px-4 py-3 text-xs text-slate-500">
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
                    "hover:bg-slate-50",
                    dragOverKey === status.key && draggedKey !== status.key
                      ? "border-t-2 border-slate-900"
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
                  <TableCell className="py-2 text-slate-500">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-50"
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
                      Drag
                    </button>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full border border-slate-300"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-xs font-mono text-slate-500">
                        {status.color}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-sm">{status.label}</TableCell>
                  <TableCell className="py-2 text-sm font-mono text-slate-500">
                    {status.key}
                  </TableCell>
                  <TableCell className="py-2 text-sm">{status.sort_order}</TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(status)}
                        aria-label={`Edit ${status.label}`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingStatus(status)}
                        aria-label={`Delete ${status.label}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </EntityTableShell>
      </DataState>

      <FormDialogShell
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        title={editingStatus ? "Edit Status" : "Create Status"}
        description={editingStatus ? "Update the status label or color." : "Create a new ticket status."}
        formId="status-form"
        submitLabel={saving ? "Saving..." : "Save"}
        submitDisabled={saving}
      >
        <form
          id="status-form"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
          className="space-y-4"
        >
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
            <Label htmlFor="status-color">Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="status-color"
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
        </form>
      </FormDialogShell>

      <ConfirmDialog
        open={!!deletingStatus}
        onOpenChange={(open) => !open && setDeletingStatus(null)}
        title="Delete status?"
        description={`This will remove the ${deletingStatus?.label || "selected"} status.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deletingStatus) {
            void handleDelete(deletingStatus)
          }
        }}
      />
    </EntityPageLayout>
  )
}
