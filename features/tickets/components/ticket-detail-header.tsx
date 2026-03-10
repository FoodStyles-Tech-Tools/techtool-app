"use client"

import { ArrowLeft, Copy, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TicketStatusSelect } from "@/components/ticket-status-select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Ticket } from "@/lib/types"

type TicketDetailHeaderProps = {
  ticketId: string
  ticket: Ticket | null | undefined
  parentNavigationSlug: string | null
  canEditTickets: boolean
  isAssignmentLocked: boolean
  isUpdatingStatus: boolean
  onGoToParentTicket: () => void
  onCopyTicketLabel: () => void
  onCopyShareUrl: () => void
  onCopyHyperlinkedUrl: () => void
  onStatusChange: (newStatus: string) => void
}

export function TicketDetailHeader({
  ticketId,
  ticket,
  parentNavigationSlug,
  canEditTickets,
  isAssignmentLocked,
  isUpdatingStatus,
  onGoToParentTicket,
  onCopyTicketLabel,
  onCopyShareUrl,
  onCopyHyperlinkedUrl,
  onStatusChange,
}: TicketDetailHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {parentNavigationSlug ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onGoToParentTicket}
            title="Back to parent ticket"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to parent
          </Button>
        ) : null}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onCopyTicketLabel}
            title="Copy ticket info"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Share ticket"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onCopyShareUrl}>Share URL</DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyHyperlinkedUrl}>Hyperlinked URL</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="rounded-md bg-background px-2.5 py-1 font-mono text-sm text-muted-foreground">
            {ticket?.displayId || ticket?.display_id || ticketId.slice(0, 8)}
          </span>
        </div>
        {ticket ? (
          <TicketStatusSelect
            value={ticket.status}
            onValueChange={onStatusChange}
            disabled={!canEditTickets || isAssignmentLocked || isUpdatingStatus}
            allowSqaStatuses={ticket.project?.require_sqa === true}
            triggerClassName="h-7 text-xs"
          />
        ) : null}
      </div>
    </div>
  )
}
