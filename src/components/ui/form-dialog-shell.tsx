import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { Button } from "@client/components/ui/button"

export type FormDialogShellProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  formId: string
  submitLabel: string
  cancelLabel?: string
  submitDisabled?: boolean
  showCloseButton?: boolean
  children: React.ReactNode
}

export function FormDialogShell({
  open,
  onOpenChange,
  title,
  description,
  formId,
  submitLabel,
  cancelLabel = "Cancel",
  submitDisabled,
  showCloseButton = false,
  children,
}: FormDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={showCloseButton} className="flex h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto border-y border-slate-200 px-6 py-6">
          {children}
        </div>
        <DialogFooter className="px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitDisabled}>
            {cancelLabel}
          </Button>
          <Button type="submit" form={formId} disabled={submitDisabled}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
