"use client"

import { toast } from "@client/components/ui/toast"
import type { Ticket } from "@lib/types"

const TICKET_SHARE_BASE_URL = "https://techtool-app.vercel.app/tickets"

type UseTicketDetailSharingParams = {
  ticket: Ticket | null | undefined
}

export function useTicketDetailSharing({ ticket }: UseTicketDetailSharingParams) {
  const handleCopyTicketLabel = () => {
    if (!ticket) return
    const projectName = ticket.project?.name || "No Project"
    const label = `[${projectName}] ${ticket.displayId || ticket.id.slice(0, 8)}_${ticket.title}`
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
    const slug = String(ticket.displayId || ticket.id).toLowerCase()
    return `${TICKET_SHARE_BASE_URL}/${slug}`
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
