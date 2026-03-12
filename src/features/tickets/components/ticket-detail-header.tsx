"use client"

import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import { Input } from "@client/components/ui/input"
import { cn } from "@client/lib/utils"
import { Breadcrumb } from "@client/components/ui/breadcrumb"
import type { Ticket } from "@shared/types"
import type { BreadcrumbItem } from "@client/components/ui/breadcrumb"

type TicketDetailHeaderProps = {
  ticketId: string
  ticket: Ticket | null | undefined
  parentNavigationSlug: string | null
  parentLabel?: string | null
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
  parentNavigationSlug,
  parentLabel,
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
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Tickets", href: "/tickets" },
    ...(parentNavigationSlug && parentLabel
      ? [{ label: parentLabel, href: `/tickets/${parentNavigationSlug}` }]
      : []),
    { label: displayId },
  ]

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Breadcrumb items={breadcrumbItems} />
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
