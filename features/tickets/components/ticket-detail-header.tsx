"use client"

import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { TicketStatusSelect } from "@/components/ticket-status-select"
import { TicketPriorityIcon } from "@/components/ticket-priority-select"
import { TicketTypeIcon } from "@/components/ticket-type-select"
import { getDueDateDisplay } from "@/lib/format-dates"
import { isDoneStatus, normalizeStatusKey } from "@/lib/ticket-statuses"
import { cn } from "@/lib/utils"
import type { Ticket } from "@/lib/types"

type TicketDetailHeaderProps = {
  ticketId: string
  ticket: Ticket | null | undefined
  parentNavigationSlug: string | null
  canEditTickets: boolean
  isAssignmentLocked: boolean
  isUpdatingStatus: boolean
  isEditingTitle: boolean
  titleValue: string
  onTitleValueChange: (value: string) => void
  onTitleSave: () => void | Promise<void>
  onTitleKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  onStartTitleEdit: () => void
  onBackToTickets: () => void
  onGoToParentTicket: () => void
  onCopyTicketLabel: () => void
  onCopyShareUrl: () => void
  onCopyHyperlinkedUrl: () => void
  onRequestDelete: () => void
  onStatusChange: (newStatus: string) => void
}

export function TicketDetailHeader({
  ticketId,
  ticket,
  parentNavigationSlug,
  canEditTickets,
  isAssignmentLocked,
  isUpdatingStatus,
  isEditingTitle,
  titleValue,
  onTitleValueChange,
  onTitleSave,
  onTitleKeyDown,
  onStartTitleEdit,
  onBackToTickets,
  onGoToParentTicket,
  onCopyTicketLabel,
  onCopyShareUrl,
  onCopyHyperlinkedUrl,
  onRequestDelete,
  onStatusChange,
}: TicketDetailHeaderProps) {
  const displayId = ticket?.displayId || ticketId.slice(0, 8)
  const assigneeLabel = ticket?.assignee?.name || ticket?.assignee?.email || "Unassigned"
  const dueDateDisplay = getDueDateDisplay(
    ticket?.dueDate,
    ticket ? isDoneStatus(normalizeStatusKey(ticket.status)) : false
  )

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onBackToTickets}>
            Back to tickets
          </Button>
          {parentNavigationSlug ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900"
              onClick={onGoToParentTicket}
              title="Back to parent ticket"
            >
              Parent ticket
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {ticket ? (
            <TicketStatusSelect
              value={ticket.status}
              onValueChange={onStatusChange}
              disabled={!canEditTickets || isAssignmentLocked || isUpdatingStatus}
              allowSqaStatuses={ticket.project?.require_sqa === true}
              triggerClassName="h-8 text-xs"
            />
          ) : null}
          <details className="relative">
            <summary className="list-none [&::-webkit-details-marker]:hidden">
              <Button type="button" variant="outline" size="sm" className="h-8 px-3">
                Actions
              </Button>
            </summary>
            <div className="absolute right-0 z-40 mt-2 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-md">
              <button
                type="button"
                onClick={onCopyTicketLabel}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100"
              >
                Copy ticket info
              </button>
              <button
                type="button"
                onClick={onCopyShareUrl}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100"
              >
                Copy URL
              </button>
              <button
                type="button"
                onClick={onCopyHyperlinkedUrl}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100"
              >
                Copy rich link
              </button>
              {ticket && canEditTickets ? (
                <button
                  type="button"
                  onClick={onRequestDelete}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Delete ticket
                </button>
              ) : null}
            </div>
          </details>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600">
            {displayId}
          </span>
          {ticket?.project?.name ? (
            <Badge variant="outline" className="text-xs">
              {ticket.project.name}
            </Badge>
          ) : null}
        </div>

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
            className={[
              "text-2xl font-semibold leading-tight text-slate-900",
              canEditTickets ? "cursor-pointer rounded-md px-1 py-1 hover:bg-slate-50" : "",
            ].join(" ")}
            onClick={() => {
              if (canEditTickets) {
                onStartTitleEdit()
              }
            }}
          >
            {ticket?.title || "Untitled ticket"}
          </h1>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1.5 text-xs">
            <TicketTypeIcon type={ticket?.type || "task"} />
            <span>{ticket?.type || "task"}</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1.5 text-xs">
            <TicketPriorityIcon priority={ticket?.priority || "medium"} />
            <span className="capitalize">{ticket?.priority || "medium"} priority</span>
          </Badge>
          <Badge variant="outline" className="text-xs">
            Assignee: {assigneeLabel}
          </Badge>
          <span className={cn("inline-flex rounded-md px-2 py-1 text-xs font-medium", dueDateDisplay.className)}>
            {dueDateDisplay.label}
          </span>
        </div>
      </div>
    </div>
  )
}
