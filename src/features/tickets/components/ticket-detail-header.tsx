"use client"

import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import { Input } from "@client/components/ui/input"
import { cn } from "@client/lib/utils"
import { Breadcrumb } from "@client/components/ui/breadcrumb"
import { Button } from "@client/components/ui/button"
import { ClipboardDocumentIcon, ShareIcon, TrashIcon } from "@heroicons/react/24/outline"
import type { Ticket } from "@shared/types"

type TicketDetailHeaderProps = {
  ticketId: string
  ticket: Ticket | null | undefined
  canEditTickets: boolean
  isAssignmentLocked: boolean
  isEditingTitle: boolean
  titleValue: string
  onTitleValueChange: (value: string) => void
  onTitleSave: () => void | Promise<void>
  onTitleKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  onStartTitleEdit: () => void
  onCopyTicketLabel: () => void
  onCopyShareUrl: () => void
  onCopyHyperlinkedUrl: () => void
  onRequestDelete: () => void
}

export function TicketDetailHeader({
  ticketId,
  ticket,
  canEditTickets,
  isEditingTitle,
  titleValue,
  onTitleValueChange,
  onTitleSave,
  onTitleKeyDown,
  onStartTitleEdit,
  onCopyTicketLabel,
  onCopyShareUrl,
  onCopyHyperlinkedUrl,
  onRequestDelete,
}: TicketDetailHeaderProps) {
  const displayId = ticket?.displayId || ticketId.slice(0, 8)

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Breadcrumb items={[{ label: "Tickets", href: "/tickets" }, { label: displayId }]} />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{String(displayId).toUpperCase()}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCopyTicketLabel}
            aria-label="Copy ticket label"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCopyShareUrl}
            aria-label="Copy share URL"
          >
            <ShareIcon className="h-4 w-4" />
          </Button>
          {canEditTickets ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700"
              onClick={onRequestDelete}
              aria-label="Archive ticket"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {isEditingTitle ? (
          <Input
            value={titleValue}
            onChange={(event) => onTitleValueChange(event.target.value)}
            onBlur={() => void onTitleSave()}
            onKeyDown={onTitleKeyDown}
            className="h-11 text-2xl font-semibold"
            disabled={!canEditTickets}
            autoFocus
          />
        ) : (
          <h1
            className={cn(
              "text-2xl font-semibold leading-tight text-foreground",
              canEditTickets && "cursor-pointer rounded-md px-1 py-1 hover:bg-accent"
            )}
            onClick={() => {
              if (canEditTickets) {
                onStartTitleEdit()
              }
            }}
          >
            {ticket?.title || "Untitled ticket"}
          </h1>
        )}
      </div>
    </div>
  )
}
