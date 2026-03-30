"use client"

import { useMemo, useState } from "react"
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from "@heroicons/react/20/solid"
import { Button } from "@client/components/ui/button"
import { PageLayout } from "@client/components/ui/page-layout"
import { PageHeader } from "@client/components/ui/page-header"
import { EntityTableShell } from "@client/components/ui/entity-table-shell"
import { Input } from "@client/components/ui/input"
import { Label } from "@client/components/ui/label"
import { Switch } from "@client/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { ConfirmDialog } from "@client/components/ui/confirm-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table"
import { usePermissions } from "@client/hooks/use-permissions"
import { useTicketStatuses } from "@client/hooks/use-ticket-statuses"
import { normalizeStatusKey, type TicketStatus } from "@shared/ticket-statuses"
import { toast } from "@client/components/ui/toast"

type StatusDraft = {
  label: string
  color: string
  sqaFlow: boolean
}

type StatusRow = TicketStatus & {
  updated_at?: string
}

const DEFAULT_COLOR = "#9ca3af"

export function WorkspaceStatusPanel() {
  const { flags } = usePermissions()
  const canManageStatus = flags?.canManageStatus ?? false
  const { statuses, loading, refresh } = useTicketStatuses({ fallback: false, enabled: canManageStatus })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<TicketStatus | null>(null)
  const [draft, setDraft] = useState<StatusDraft>({ label: "", color: DEFAULT_COLOR, sqaFlow: false })
  const [saving, setSaving] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [statusToDelete, setStatusToDelete] = useState<TicketStatus | null>(null)

  const sortedStatuses = useMemo<StatusRow[]>(
    () => [...(statuses as StatusRow[])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [statuses]
  )

  const openCreate = () => {
    setEditingStatus(null)
    setDraft({ label: "", color: DEFAULT_COLOR, sqaFlow: false })
    setDialogOpen(true)
  }

  const openEdit = (status: TicketStatus) => {
    setEditingStatus(status)
    setDraft({
      label: status.label,
      color: status.color || DEFAULT_COLOR,
      sqaFlow: status.sqa_flow === true,
    })
    setDialogOpen(true)
  }

  const handleMoveStatus = async (statusKey: string, direction: "up" | "down") => {
    const currentIndex = sortedStatuses.findIndex((status) => status.key === statusKey)
    if (currentIndex === -1) return

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sortedStatuses.length) return

    const reordered = [...sortedStatuses]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    setReordering(true)
    try {
      const res = await fetch("/api/ticket-statuses/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((status) => status.key) }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => null)
        throw new Error(error?.error || "Failed to reorder statuses")
      }

      await refresh()
      toast("Status order updated")
    } catch (error: any) {
      toast(error.message || "Failed to reorder statuses", "error")
    } finally {
      setReordering(false)
    }
  }

  const handleSave = async () => {
    const trimmedLabel = draft.label.trim()
    const normalizedColor = draft.color.trim().startsWith("#") ? draft.color.trim() : `#${draft.color.trim()}`
    const colorRegex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/
    const normalizedKey = normalizeStatusKey(trimmedLabel)

    if (!trimmedLabel) {
      toast("Label is required", "error")
      return
    }
    if (!normalizedKey) {
      toast("Status key is invalid", "error")
      return
    }
    if (!colorRegex.test(normalizedColor)) {
      toast("Color must be a valid hex value", "error")
      return
    }

    setSaving(true)
    try {
      const payload = editingStatus
        ? {
            label: trimmedLabel,
            color: normalizedColor,
            sort_order: editingStatus.sort_order,
            sqa_flow: draft.sqaFlow,
          }
        : {
            key: normalizedKey,
            label: trimmedLabel,
            color: normalizedColor,
            sort_order: sortedStatuses.length + 1,
            sqa_flow: draft.sqaFlow,
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
        const error = await res.json().catch(() => null)
        throw new Error(error?.error || "Failed to save status")
      }

      await refresh()
      toast(editingStatus ? "Status updated" : "Status created")
      setDialogOpen(false)
      setEditingStatus(null)
    } catch (error: any) {
      toast(error.message || "Failed to save status", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (status: TicketStatus) => {
    try {
      const res = await fetch(`/api/ticket-statuses/${encodeURIComponent(status.key)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const error = await res.json().catch(() => null)
        throw new Error(error?.error || "Failed to delete status")
      }
      await refresh()
      toast("Status deleted")
    } catch (error: any) {
      toast(error.message || "Failed to delete status", "error")
    } finally {
      setStatusToDelete(null)
    }
  }

  if (!canManageStatus) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Status</h3>
        <p className="text-sm text-muted-foreground">You do not have permission to manage statuses.</p>
      </div>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Status"
        actions={
          <Button type="button" size="sm" variant="outline" onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            Create Status
          </Button>
        }
      />

      <EntityTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>SQA Flow</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8" />
              </TableRow>
            ) : sortedStatuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No statuses found.
                </TableCell>
              </TableRow>
            ) : (
              sortedStatuses.map((status) => (
                <TableRow key={status.key}>
                  <TableCell className="font-normal">{status.label}</TableCell>
                  <TableCell className="text-sm">{status.key}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full border border-input/70"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-sm">{status.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>{status.sqa_flow ? "Yes" : "No"}</TableCell>
                  <TableCell>{status.sort_order}</TableCell>
                  <TableCell>{status.updated_at ? new Date(status.updated_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => void handleMoveStatus(status.key, "up")}
                        aria-label={`Move ${status.label} up`}
                        title="Move up"
                        disabled={reordering || sortedStatuses[0]?.key === status.key}
                      >
                        <ChevronUpIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => void handleMoveStatus(status.key, "down")}
                        aria-label={`Move ${status.label} down`}
                        title="Move down"
                        disabled={reordering || sortedStatuses[sortedStatuses.length - 1]?.key === status.key}
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => openEdit(status)}
                        disabled={reordering}
                        aria-label={`Edit ${status.label}`}
                        title="Edit status"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => setStatusToDelete(status)}
                        disabled={reordering}
                        aria-label={`Delete ${status.label}`}
                        title="Delete status"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </EntityTableShell>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingStatus(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus ? "Edit Status" : "Create Status"}</DialogTitle>
            <DialogDescription>
              {editingStatus ? "Update label, color, and SQA Flow behavior." : "Create a new ticket status."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status-label">Label</Label>
              <Input
                id="status-label"
                value={draft.label}
                onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="In Review"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-color">Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="status-color"
                  type="color"
                  value={draft.color}
                  onChange={(event) => setDraft((prev) => ({ ...prev, color: event.target.value }))}
                  className="h-10 w-12 p-1"
                />
                <Input
                  value={draft.color}
                  onChange={(event) => setDraft((prev) => ({ ...prev, color: event.target.value }))}
                  placeholder="#9ca3af"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-md border border-border px-3 py-2">
              <div className="space-y-0.5">
                <Label htmlFor="status-sqa-flow">SQA Flow</Label>
                <p className="text-xs text-muted-foreground">
                  If enabled, this status is only valid for tickets in projects with Require SQA.
                </p>
              </div>
              <Switch
                id="status-sqa-flow"
                checked={draft.sqaFlow}
                onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, sqaFlow: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!statusToDelete}
        onOpenChange={(open) => !open && setStatusToDelete(null)}
        title="Delete status?"
        description={`This will remove the ${statusToDelete?.label || "selected"} status.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (statusToDelete) {
            void handleDelete(statusToDelete)
          }
        }}
      />
    </PageLayout>
  )
}
