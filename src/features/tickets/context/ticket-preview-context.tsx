"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { useNavigate } from "react-router-dom"
import { TicketDetailPreviewModal } from "@client/features/tickets/components/ticket-detail-preview-modal"

export type OpenTicketPreviewParams =
  | { ticketId: string; slug: string }
  | { slug: string }

type TicketPreviewContextValue = {
  openPreview: (params: OpenTicketPreviewParams) => void
  closePreview: () => void
}

const TicketPreviewContext = createContext<TicketPreviewContextValue | null>(null)

export function useTicketPreview() {
  const ctx = useContext(TicketPreviewContext)
  if (!ctx) {
    throw new Error("useTicketPreview must be used within TicketPreviewProvider")
  }
  return ctx
}

export function TicketPreviewProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [previewTicketId, setPreviewTicketId] = useState<string | null>(null)
  const [previewSlug, setPreviewSlug] = useState<string>("")

  const openPreview = useCallback((params: OpenTicketPreviewParams) => {
    if ("ticketId" in params) {
      setPreviewTicketId(params.ticketId)
      setPreviewSlug(params.slug)
      return
    }
    setPreviewSlug(params.slug)
    setPreviewTicketId(null)
  }, [])

  const closePreview = useCallback(() => {
    setPreviewTicketId(null)
    setPreviewSlug("")
  }, [])

  // When only slug was provided, resolve to ticket id
  useEffect(() => {
    if (!previewSlug || previewTicketId) return
    const slug = previewSlug.toLowerCase()
    let cancelled = false
    fetch(`/api/tickets/by-display-id/${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ticket?: { id: string } } | null) => {
        if (cancelled || !data?.ticket?.id) return
        setPreviewTicketId(data.ticket.id)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [previewSlug, previewTicketId])

  const handleExpand = useCallback(() => {
    if (previewSlug) {
      navigate(`/tickets/${previewSlug}`)
    }
    closePreview()
  }, [navigate, previewSlug, closePreview])

  const value: TicketPreviewContextValue = { openPreview, closePreview }

  return (
    <TicketPreviewContext.Provider value={value}>
      {children}
      <TicketDetailPreviewModal
        open={!!previewSlug}
        onOpenChange={(open) => !open && closePreview()}
        ticketId={previewTicketId ?? ""}
        onExpand={handleExpand}
      />
    </TicketPreviewContext.Provider>
  )
}
