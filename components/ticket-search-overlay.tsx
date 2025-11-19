"use client"

import { useState, useEffect, useRef, useCallback, useDeferredValue, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useTickets } from "@/hooks/use-tickets"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { TicketStatusIcon } from "@/components/ticket-status-select"
import { TicketPriorityIcon } from "@/components/ticket-priority-select"
import { TicketTypeIcon } from "@/components/ticket-type-select"

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
  const { data: ticketsData, isLoading } = useTickets()
  const deferredQuery = useDeferredValue(searchQuery)

  const tickets = useMemo(() => ticketsData || [], [ticketsData])

  // Filter tickets based on search query with a deferred value to keep typing responsive
  const filteredTickets = useMemo(() => {
    if (!tickets.length) return []
    const trimmedQuery = deferredQuery.trim().toLowerCase()
    if (!trimmedQuery) {
      return tickets.slice(0, MAX_SEARCH_RESULTS)
    }
    return tickets
      .filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(trimmedQuery) ||
          ticket.description?.toLowerCase().includes(trimmedQuery) ||
          ticket.project?.name.toLowerCase().includes(trimmedQuery) ||
          ticket.display_id?.toLowerCase().includes(trimmedQuery)
      )
      .slice(0, MAX_SEARCH_RESULTS)
  }, [tickets, deferredQuery])

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
        setSelectedIndex((prev) => Math.min(prev + 1, filteredTickets.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
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
          "fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-in-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
      />
      
      {/* Overlay */}
      <div 
        className={cn(
          "fixed left-1/2 top-1/2 z-[100] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ease-in-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="mx-4 rounded-lg border bg-background shadow-lg">
          {/* Search Input */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
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
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Loading tickets...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
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
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {ticket.display_id || ticket.id.slice(0, 8)}
                        </span>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <TicketStatusIcon status={ticket.status} />
                          {ticket.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <TicketPriorityIcon priority={ticket.priority} />
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <TicketTypeIcon type={ticket.type || "task"} />
                          {ticket.type || "task"}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-medium truncate">{ticket.title}</h4>
                      {ticket.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {ticket.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
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




