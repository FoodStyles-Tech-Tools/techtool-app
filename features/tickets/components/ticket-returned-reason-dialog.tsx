"use client"

import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor").then((mod) => mod.RichTextEditor),
  { ssr: false }
)

export function TicketReturnedReasonDialog({
  open,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  onShortcutSubmit,
  disabled = false,
  description = "Add the reason before moving this ticket to Returned to Dev.",
  placeholder = "Explain what should be fixed before QA can continue...",
}: {
  open: boolean
  reason: string
  onReasonChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  onShortcutSubmit?: () => void | Promise<void>
  disabled?: boolean
  description?: string
  placeholder?: string
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Returned to Dev Reason</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <RichTextEditor
            value={reason}
            onChange={onReasonChange}
            placeholder={placeholder}
            minHeight={180}
            onContentKeyDown={(event: KeyboardEvent) => {
              if (onShortcutSubmit && (event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault()
                void onShortcutSubmit()
                return true
              }
              return false
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => void onConfirm()} disabled={disabled}>
            Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
