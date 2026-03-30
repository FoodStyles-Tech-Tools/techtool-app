"use client"

import { toast } from "@client/components/ui/toast"
import type { Ticket } from "@shared/types"
import {
  buildTicketClipboardLabel,
  buildTicketShareUrl,
} from "@client/features/tickets/lib/share-url"

type UseTicketDetailSharingParams = {
  ticket: Ticket | null | undefined
}

export function useTicketDetailSharing({ ticket }: UseTicketDetailSharingParams) {
  const handleCopyTicketLabel = () => {
    if (!ticket) return
    const label = buildTicketClipboardLabel(ticket)
    if (!navigator?.clipboard?.writeText) {
      toast("Clipboard not available", "error")
      return
    }
    navigator.clipboard
      .writeText(label)
      .then(() => toast("Copied ticket info"))
      .catch(() => toast("Failed to copy ticket info", "error"))
  }

  const getTicketShareUrl = () => {
    if (!ticket) return null
    return buildTicketShareUrl(ticket)
  }

  const handleCopyShareUrl = () => {
    const shareUrl = getTicketShareUrl()
    if (!shareUrl) return
    if (!navigator?.clipboard?.writeText) {
      toast("Clipboard not available", "error")
      return
    }
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => toast("Ticket URL copied"))
      .catch(() => toast("Failed to copy ticket URL", "error"))
  }

  const handleCopyHyperlinkedUrl = () => {
    if (!ticket) return
    const shareUrl = getTicketShareUrl()
    if (!shareUrl) return
    const displayIdLabel = ticket.displayId || ticket.id.slice(0, 8).toUpperCase()
    const hyperlink = `[[${displayIdLabel}] - ${ticket.title}](${shareUrl})`
    if (!navigator?.clipboard?.writeText) {
      toast("Clipboard not available", "error")
      return
    }
    navigator.clipboard
      .writeText(hyperlink)
      .then(() => toast("Hyperlinked URL copied"))
      .catch(() => toast("Failed to copy hyperlinked URL", "error"))
  }

  return {
    handleCopyTicketLabel,
    handleCopyShareUrl,
    handleCopyHyperlinkedUrl,
  }
}
