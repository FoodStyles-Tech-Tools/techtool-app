"use client"

import { lazyComponent } from "@client/lib/lazy-component"
import { Button } from "@client/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { Textarea } from "@client/components/ui/textarea"

const RichTextEditor = lazyComponent(
  () => import("@client/components/rich-text-editor").then((mod) => mod.RichTextEditor),
)

type ReasonFormDialogProps = {
  open: boolean
  title: string
  description?: string
  value: string
  onChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  onShortcutSubmit?: () => void | Promise<void>
  disabled?: boolean
  confirmLabel?: string
  destructive?: boolean
  /** When true, use rich-text editor instead of textarea. */
  richText?: boolean
  /** Optional placeholder text for the input. */
  placeholder?: string
  /** Optional custom max-width for the dialog content. */
  contentClassName?: string
}

export function ReasonFormDialog({
  open,
  title,
  description,
  value,
  onChange,
  onCancel,
  onConfirm,
  onShortcutSubmit,
  disabled = false,
  confirmLabel = "Confirm",
  destructive = false,
  richText = false,
  placeholder,
  contentClassName,
}: ReasonFormDialogProps) {
  const handleShortcutSubmit = () => {
    if (!onShortcutSubmit) {
      return onConfirm()
    }
    return onShortcutSubmit()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-4 py-4">
          {richText ? (
            <RichTextEditor
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              minHeight={180}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onContentKeyDown={(event: any) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault()
                  void handleShortcutSubmit()
                  return true
                }
                return false
              }}
            />
          ) : (
            <Textarea
              placeholder={placeholder}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault()
                  void handleShortcutSubmit()
                }
              }}
              rows={4}
              className="resize-none"
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => void onConfirm()}
            disabled={disabled}
            variant={destructive ? "destructive" : "default"}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

