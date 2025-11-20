"use client"

import { Fragment } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const shortcuts = [
  {
    action: "Open ticket search",
    description: "Quickly find tickets from anywhere in the app.",
    combos: [
      ["Ctrl", "F"],
      ["Cmd", "F"],
    ],
  },
  {
    action: "Create a new ticket",
    description: "Opens the global new ticket dialog.",
    combos: [["Alt", "A"]],
  },
  {
    action: "Create a new project",
    description: "Opens the Add Project dialog from anywhere.",
    combos: [
      ["Alt", "P"],
      ["Cmd", "P"],
    ],
  },
  {
    action: "Show keyboard shortcuts",
    description: "Displays this list of available shortcuts.",
    combos: [
      ["Alt", "Arrow Down"],
      ["Cmd", "Arrow Down"],
    ],
  },
  {
    action: "Close dialogs",
    description: "Closes the active ticket dialog.",
    combos: [["Esc"]],
  },
]

interface KeyboardShortcutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const keyClass =
  "rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground"

export function KeyboardShortcutDialog({ open, onOpenChange }: KeyboardShortcutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Stay in flow with quick actions.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.action}
              className="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-card/60 p-3"
            >
              <div>
                <p className="text-sm font-medium">{shortcut.action}</p>
                <p className="text-xs text-muted-foreground">{shortcut.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {shortcut.combos.map((combo, comboIndex) => (
                  <div key={`${shortcut.action}-${comboIndex}`} className="flex items-center gap-1">
                    {combo.map((key, keyIndex) => (
                      <Fragment key={`${shortcut.action}-${comboIndex}-${key}-${keyIndex}`}>
                        <kbd className={keyClass}>{key}</kbd>
                        {keyIndex !== combo.length - 1 && (
                          <span className="text-xs text-muted-foreground">+</span>
                        )}
                      </Fragment>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
