"use client"

import { useState } from "react"
import { toast } from "@client/components/ui/toast"
import type { Ticket } from "@lib/types"

type UseTicketDetailLinkActionsParams = {
  ticket: Ticket | null | undefined
  ensureCanEdit: (options?: { allowWhenUnassigned?: boolean; allowSqaSelfAssign?: boolean }) => boolean
  updateTicketWithToast: (
    updates: Record<string, any>,
    successMessage: string,
    fieldName?: string
  ) => Promise<void>
}

export function useTicketDetailLinkActions({
  ticket,
  ensureCanEdit,
  updateTicketWithToast,
}: UseTicketDetailLinkActionsParams) {
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null)
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [isAddingLink, setIsAddingLink] = useState(false)

  const validateLinkUrl = () => {
    const url = newLinkUrl.trim()
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      toast("URL must start with http:// or https://", "error")
      return null
    }
    return url
  }

  const handleAddLink = async () => {
    if (!ensureCanEdit()) return
    if (!ticket || !newLinkUrl.trim()) return

    const url = validateLinkUrl()
    if (!url) return

    await updateTicketWithToast({ links: [...(ticket.links || []), url] }, "Link added", "links")
    setIsAddingLink(false)
    setNewLinkUrl("")
  }

  const handleUpdateLink = async (index: number) => {
    if (!ensureCanEdit()) return
    if (!ticket || !newLinkUrl.trim()) return

    const url = validateLinkUrl()
    if (!url) return

    const currentLinks = [...(ticket.links || [])]
    currentLinks[index] = url
    await updateTicketWithToast({ links: currentLinks }, "Link updated", "links")
    setEditingLinkIndex(null)
    setNewLinkUrl("")
  }

  const handleRemoveLink = async (index: number) => {
    if (!ensureCanEdit()) return
    if (!ticket) return

    const currentLinks = [...(ticket.links || [])]
    currentLinks.splice(index, 1)
    await updateTicketWithToast({ links: currentLinks }, "Link removed", "links")
  }

  return {
    editingLinkIndex,
    setEditingLinkIndex,
    newLinkUrl,
    setNewLinkUrl,
    isAddingLink,
    setIsAddingLink,
    handleAddLink,
    handleUpdateLink,
    handleRemoveLink,
  }
}
