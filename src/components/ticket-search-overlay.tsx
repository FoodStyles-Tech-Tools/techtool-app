"use client"

import { useState, useEffect, useRef, useCallback, useDeferredValue, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@client/components/ui/input"
import { Badge } from "@client/components/ui/badge"
import { cn } from "@client/lib/utils"
import { TicketStatusIcon } from "@client/components/ticket-status-select"
import { useTicketStatuses } from "@client/hooks/use-ticket-statuses"
import { formatStatusLabel, normalizeStatusKey } from "@shared/ticket-statuses"
import { TicketTypeIcon } from "@client/components/ticket-type-select"

const MAX_SEARCH_RESULTS = 50

interface TicketSearchOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTicket?: (ticketId: string) => void
}

export function TicketSearchOverlay({ open, onOpenChange, onSelectTicket }: TicketSearchOverlayProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const deferredQuery = useDeferredValue(searchQuery.trim())
  const ticketsQuery = useQuery<{
    items?: Array<{
      id: string
      displayId: string | null
      title: string
      status: string
      priority: string
      type: string | null
      project: { id: string; name: string } | null
    }>
    data: Array<{
      id: string
      displayId: string | null
      title: string
      status: string
      priority: string
      type: string | null
      project: { id: string; name: string } | null
    }>
  }>({
    queryKey: ["ticket-search", deferredQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        view: "list",
        limit: String(MAX_SEARCH_RESULTS),
      })
      if (deferredQuery) {
        params.set("q", deferredQuery)
      }

      const response = await fetch(`/api/v2/tickets?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to load tickets")
      }
      const payload = await response.json()
      const normalize = (ticket: { id: string; display_id?: string | null; displayId?: string | null; title: string; status: string; priority: string; type: string | null; project: { id: string; name: string } | null }) => ({
        ...ticket,
        displayId: ticket.displayId ?? ticket.display_id ?? null,
      })
      return {
        ...payload,
        items: (payload.items ?? []).map(normalize),
        data: (payload.data ?? payload.items ?? []).map(normalize),
      }
    },
    enabled: open,
    staleTime: 30 * 1000,
  })
  const { statusMap } = useTicketStatuses({ enabled: open, realtime: false })
  const filteredTickets = useMemo(
    () => ticketsQuery.data?.items || ticketsQuery.data?.data || [],
    [ticketsQuery.data?.items, ticketsQuery.data?.data]
  )
  const isLoading = ticketsQuery.isLoading

  const handleSelectTicket = useCallback((ticketId: string) => {
    if (onSelectTicket) {
      onSelectTicket(ticketId)
    }
    onOpenChange(false)
  }, [onOpenChange, onSelectTicket])

  // Focus input when overlay opens, restore focus when it closes
  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure overlay is fully rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      setSearchQuery("")
      setSelectedIndex(0)
    } else if (!open) {
      // Restore focus to document body when overlay closes to ensure keyboard events work
      // Use setTimeout to ensure this happens after the close animation
      setTimeout(() => {
        // Blur any active element first
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        // Focus body to ensure keyboard events are captured
        document.body.focus()
      }, 150)
    }
  }, [open])

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => {
          if (filteredTickets.length === 0) return 0
          return Math.min(prev + 1, filteredTickets.length - 1)
        })
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (filteredTickets.length === 0 ? 0 : Math.max(prev - 1, 0)))
      } else if (e.key === "Enter" && filteredTickets[selectedIndex]) {
        e.preventDefault()
        e.stopPropagation()
        handleSelectTicket(filteredTickets[selectedIndex].id)
      } else if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onOpenChange(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown, true) // Use capture phase
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [open, filteredTickets, selectedIndex, onOpenChange, handleSelectTicket])

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])


  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-slate-900/70 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
      />
      
      {/* Overlay */}
      <div 
        className={cn(
          "fixed left-1/2 top-1/2 z-[100] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="mx-4 rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Search Input */}
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Find</span>
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search tickets by title, description, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-sm px-2 py-1 text-xs font-medium text-slate-500 opacity-70 transition-opacity hover:bg-slate-100 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Close
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {isLoading ? null : filteredTickets.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                {searchQuery ? "No tickets found" : "Start typing to search tickets"}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTickets.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket.id)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 transition-colors",
                      index === selectedIndex
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">
                          {ticket.displayId || ticket.id.slice(0, 8)}
                        </span>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <TicketStatusIcon status={ticket.status} statusMap={statusMap} />
                          {statusMap.get(normalizeStatusKey(ticket.status))?.label ||
                            formatStatusLabel(ticket.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <TicketTypeIcon type={ticket.type || "task"} />
                          {ticket.type || "task"}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-medium truncate">{ticket.title}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {ticket.project?.name || "No Project"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
