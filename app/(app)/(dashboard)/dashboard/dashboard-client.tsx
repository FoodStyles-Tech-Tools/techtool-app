"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { format, parseISO, isToday } from "date-fns"
import { Button } from "@/components/ui/button"
import { formatStatusLabel, normalizeStatusKey, type TicketStatus } from "@/lib/ticket-statuses"
import type { CalendarEvent, TicketSummary } from "@/lib/types"
import { getSanitizedHtmlProps } from "@/lib/sanitize-html"

const TicketDetailDialog = dynamic(
  () => import("@/components/ticket-detail-dialog").then((mod) => mod.TicketDetailDialog),
  { ssr: false }
)

type DashboardCalendar = {
  status: "connected" | "needs_connection"
  events: CalendarEvent[]
  error: string | null
}

interface DashboardClientProps {
  tickets: TicketSummary[]
  ticketsError: string | null
  ticketStatuses: TicketStatus[]
  calendar: DashboardCalendar
}

export function DashboardClient({
  tickets,
  ticketsError,
  ticketStatuses,
  calendar,
}: DashboardClientProps) {
  const router = useRouter()
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }, [])
  const today = useMemo(() => format(new Date(), "EEEE, MMMM d"), [])

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const statusMap = useMemo(
    () => new Map(ticketStatuses.map((status) => [status.key, status])),
    [ticketStatuses]
  )

  const getTicketStatusLabel = useCallback(
    (statusValue: string) => {
      const normalized = normalizeStatusKey(statusValue)
      return statusMap.get(normalized)?.label || formatStatusLabel(statusValue)
    },
    [statusMap]
  )

  const handleConnect = () => {
    if (typeof window === "undefined") return
    const returnTo = window.location.pathname
    const popupUrl = `/api/calendar/connect?returnTo=${encodeURIComponent(returnTo)}&mode=popup`
    const width = 520
    const height = 650
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      popupUrl,
      "calendarConnect",
      `width=${width},height=${height},left=${left},top=${top}`
    )

    if (!popup) {
      window.location.href = `/api/calendar/connect?returnTo=${encodeURIComponent(returnTo)}`
      return
    }

    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === "calendar_connect") {
        if (event.data.status === "success") {
          router.refresh()
        }
        window.removeEventListener("message", messageHandler)
        popup.close()
      }
    }

    window.addEventListener("message", messageHandler)
    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed)
        window.removeEventListener("message", messageHandler)
      }
    }, 500)
  }

  const renderEventTime = (event: CalendarEvent) => {
    const startValue = event.start?.dateTime || event.start?.date
    const endValue = event.end?.dateTime || event.end?.date
    if (!startValue) return "All day"
    const startDate = parseISO(startValue)
    const endDate = endValue ? parseISO(endValue) : null
    if (!endDate) return format(startDate, "MMM d, h:mm a")
    const sameDay = startDate.toDateString() === endDate.toDateString()
    return sameDay
      ? `${format(startDate, "MMM d, h:mm a")} – ${format(endDate, "h:mm a")}`
      : `${format(startDate, "MMM d, h:mm a")} → ${format(endDate, "MMM d, h:mm a")}`
  }

  const getMeetingLink = (event: CalendarEvent) => {
    if (event.hangoutLink) return event.hangoutLink
    const entry =
      event.conferenceData?.entryPoints?.find((point) => point.entryPointType === "video") ||
      event.conferenceData?.entryPoints?.[0]
    return entry?.uri
  }

  const groupedEvents = useMemo((): [string, CalendarEvent[]][] => {
    const byDate = calendar.events.reduce(
      (acc: Record<string, CalendarEvent[]>, event: CalendarEvent) => {
        const startValue = event.start?.dateTime || event.start?.date
        const key = startValue ? format(parseISO(startValue), "yyyy-MM-dd") : "unknown"
        if (!acc[key]) acc[key] = []
        acc[key].push(event)
        return acc
      },
      {} as Record<string, CalendarEvent[]>
    )
    return Object.entries(byDate).sort(([a], [b]) => (a > b ? 1 : -1)) as [
      string,
      CalendarEvent[],
    ][]
  }, [calendar.events])

  return (
    <div className="space-y-8">
      <section className="px-8 py-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{today}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{greeting}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Stay focused and keep the flow going.</p>
      </section>

      <section className="flex justify-center">
        <div className="w-full max-w-5xl space-y-2">
          <div className="px-1">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">My tickets</p>
              <h2 className="mt-1 text-xl font-semibold">In progress</h2>
            </div>
          </div>
          {ticketsError ? (
            <p className="text-sm text-red-500">{ticketsError}</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active tickets assigned to you.</p>
          ) : (
            <div className="relative py-2">
              <div className="flex w-full gap-5 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="flex h-[160px] w-[180px] min-w-[180px] flex-col rounded-[32px] border border-border/40 bg-muted/50 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-primary/50"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {ticket.project?.name || "No Project"}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold line-clamp-2">{ticket.title}</h3>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {ticket.display_id || ticket.id.slice(0, 6)}
                      </span>
                      <span>{getTicketStatusLabel(ticket.status)}</span>
                    </div>
                    <p className="mt-auto text-[11px] text-muted-foreground">
                      {format(new Date(ticket.created_at), "MMM d, yyyy")}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="flex justify-center">
        <div className="w-full max-w-5xl space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Upcoming events</p>
              <h2 className="mt-1 text-xl font-semibold">Next 7 days</h2>
            </div>
          </div>

          {calendar.status === "needs_connection" ? (
            <div>
              <Button onClick={handleConnect}>Connect to my calendar</Button>
              {calendar.error && <p className="mt-3 text-sm text-red-500">{calendar.error}</p>}
            </div>
          ) : calendar.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {calendar.status === "connected"
                ? "No upcoming events found."
                : "Connect to see your calendar."}
            </p>
          ) : (
            <div className="space-y-6 rounded-3xl border border-border bg-muted/30 px-4 py-4 max-h-[320px] overflow-y-auto">
              {groupedEvents.map(([dateKey, dayEvents]) => {
                const firstStart = dayEvents[0]?.start?.dateTime || dayEvents[0]?.start?.date
                const dateObj = firstStart ? parseISO(firstStart) : new Date()
                const label = isToday(dateObj)
                  ? `Today ${format(dateObj, "MMMM d")}`
                  : format(dateObj, "EEEE MMMM d")
                return (
                  <div key={dateKey} className="flex gap-6 px-3">
                    <div className="w-40 shrink-0 text-xs font-semibold tracking-wide text-muted-foreground">
                      <span className={isToday(dateObj) ? "text-red-400" : undefined}>{label}</span>
                    </div>
                    <div className="flex-1 space-y-4">
                      {dayEvents.map((event) => {
                        const meetingLink = getMeetingLink(event)
                        const summaryProps = getSanitizedHtmlProps(event.summary)
                        return (
                          <div
                            key={event.id}
                            className="rounded-2xl border border-transparent bg-card px-5 py-3 shadow-sm dark:border-0"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex flex-1">
                                <div className="mr-3 w-[2px] rounded-full border-l-2 border-dashed border-blue-400" />
                                <div className="flex-1">
                                  {summaryProps ? (
                                    <p className="text-sm font-semibold" dangerouslySetInnerHTML={summaryProps} />
                                  ) : (
                                    <p className="text-sm font-semibold">
                                      {event.summary || "Untitled event"}
                                    </p>
                                  )}
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    {renderEventTime(event)}
                                  </p>
                                  {event.location && (
                                    <p className="mt-1 text-xs text-muted-foreground">📍 {event.location}</p>
                                  )}
                                </div>
                              </div>
                              {meetingLink && (
                                <Button
                                  size="sm"
                                  className="bg-[#dbeafe] text-[#1d4ed8] hover:bg-[#bfdbfe]"
                                  onClick={() => window.open(meetingLink, "_blank", "noopener,noreferrer")}
                                >
                                  Join meeting
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {calendar.error && calendar.status === "connected" && (
            <p className="text-sm text-red-500">
              {calendar.error} — try refreshing your events or reconnecting.
            </p>
          )}
        </div>
      </section>

      <TicketDetailDialog
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicketId(null)
          }
        }}
      />
    </div>
  )
}
