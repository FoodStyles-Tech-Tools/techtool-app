"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { format, startOfWeek, endOfWeek, addDays, differenceInDays, parseISO } from "date-fns"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTicketStatuses } from "@/hooks/use-ticket-statuses"
import { formatStatusLabel, normalizeStatusKey } from "@/lib/ticket-statuses"

interface GanttItem {
  id: string
  name: string
  type: "sprint" | "epic" | "ticket"
  status?: string
  startDate?: Date | null
  endDate?: Date | null
  children?: GanttItem[]
  color?: string
  displayId?: string | null
  level: number
  sprintId?: string // Store actual sprint ID for sprint items
}

interface GanttChartProps {
  tickets: Array<{
    id: string
    title: string
    status: string
    sprint_id?: string | null
    sprint?: { id: string; name: string; status: string; start_date?: string | null; end_date?: string | null } | null
    epic_id?: string | null
    epic?: { id: string; name: string; color: string } | null
    created_at: string
    started_at?: string | null
    completed_at?: string | null
    display_id?: string | null
  }>
  sprints: Array<{
    id: string
    name: string
    status: string
    start_date?: string | null
    end_date?: string | null
  }>
  epics: Array<{
    id: string
    name: string
    color: string
  }>
  onTicketClick?: (ticketId: string) => void
  onSprintClick?: (sprintId: string) => void
}

const SPRINT_STATUS_COLORS: Record<string, string> = {
  active: "#f59e0b",
  planned: "#3b82f6",
  closed: "#ef4444",
  completed: "#22c55e",
  cancelled: "#ef4444",
}

const DAY_WIDTH = 20 // pixels per day
const ROW_HEIGHT = 36
const INDENT_PER_LEVEL = 20

export function GanttChart({ tickets, sprints, epics, onTicketClick, onSprintClick }: GanttChartProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const timelineRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { statusMap } = useTicketStatuses()

  // Organize tickets into Sprint > Epic > Ticket hierarchy
  const ganttData = useMemo(() => {
    const items: GanttItem[] = []
    const sprintMap = new Map<string, GanttItem>()
    const epicMap = new Map<string, GanttItem>()

    // Filter sprints and epics to only include those that have tickets or are in the provided lists
    const validSprintIds = new Set(sprints.map(s => s.id))
    const validEpicIds = new Set(epics.map(e => e.id))

    // Group tickets by sprint_id first, then epic_id
    // Hierarchy: Sprint (Grand Parent) > Epic (Parent) > Ticket (Child)
    tickets.forEach((ticket) => {
      // Use sprint_id directly if available, otherwise use sprint relation
      const sprintId = ticket.sprint_id || ticket.sprint?.id || "no_sprint"
      // Use epic_id directly if available, otherwise use epic relation
      const epicId = ticket.epic_id || ticket.epic?.id || "no_epic"
      
      // Only process if sprint/epic are valid (in the provided lists) or are "no_sprint"/"no_epic"
      if (sprintId !== "no_sprint" && !validSprintIds.has(sprintId)) return
      if (epicId !== "no_epic" && !validEpicIds.has(epicId)) return

      // Get or create sprint
      if (!sprintMap.has(sprintId)) {
        const sprint = sprints.find(s => s.id === sprintId) || {
          id: sprintId,
          name: sprintId === "no_sprint" ? "No Sprint" : "Unknown Sprint",
          status: "planned",
          start_date: null,
          end_date: null,
        }

        const sprintItem: GanttItem = {
          id: sprintId,
          name: sprint.name,
          type: "sprint",
          status: sprint.status,
          startDate: sprint.start_date ? parseISO(sprint.start_date) : null,
          endDate: sprint.end_date ? parseISO(sprint.end_date) : null,
          children: [],
          level: 0,
          // Store the actual sprint ID for click handling
          ...(sprintId !== "no_sprint" && { sprintId: sprintId }),
        }
        sprintMap.set(sprintId, sprintItem)
        items.push(sprintItem)
      }

      const sprintItem = sprintMap.get(sprintId)!

      // Get or create epic within sprint
      const epicKey = `${sprintId}-${epicId}`
      if (!epicMap.has(epicKey)) {
        const epic = epics.find(e => e.id === epicId) || {
          id: epicId,
          name: epicId === "no_epic" ? "No Epic" : "Unknown Epic",
          color: "#6b7280",
        }

        const epicItem: GanttItem = {
          id: epicKey,
          name: epic.name,
          type: "epic",
          color: epic.color,
          children: [],
          level: 1,
        }
        epicMap.set(epicKey, epicItem)
        sprintItem.children!.push(epicItem)
      }

      const epicItem = epicMap.get(epicKey)!

      // Calculate ticket dates
      let startDate: Date | null = null
      let endDate: Date | null = null

      if (ticket.started_at) {
        startDate = parseISO(ticket.started_at)
      } else if (ticket.created_at) {
        startDate = parseISO(ticket.created_at)
      }

      if (ticket.completed_at) {
        endDate = parseISO(ticket.completed_at)
      } else if (startDate) {
        // If started but not completed, use today as end date
        endDate = new Date()
      }

      // Create ticket item
      const ticketItem: GanttItem = {
        id: ticket.id,
        name: ticket.title,
        type: "ticket",
        status: ticket.status,
        startDate,
        endDate,
        displayId: ticket.display_id,
        level: 2,
      }

      epicItem.children!.push(ticketItem)
    })

    // Calculate sprint/epic dates from children
    items.forEach((sprint) => {
      if (sprint.children) {
        let sprintStart: Date | null = null
        let sprintEnd: Date | null = null

        sprint.children.forEach((epic) => {
          if (epic.children) {
            let epicStart: Date | null = null
            let epicEnd: Date | null = null

            epic.children.forEach((ticket) => {
              if (ticket.startDate) {
                if (!epicStart || ticket.startDate < epicStart) {
                  epicStart = ticket.startDate
                }
              }
              if (ticket.endDate) {
                if (!epicEnd || ticket.endDate > epicEnd) {
                  epicEnd = ticket.endDate
                }
              }
            })

            epic.startDate = epicStart
            epic.endDate = epicEnd

            if (epicStart !== null) {
              const epicStartDate: Date = epicStart
              if (!sprintStart || epicStartDate < sprintStart) {
                sprintStart = epicStartDate
              }
            }
            if (epicEnd !== null) {
              const epicEndDate: Date = epicEnd
              if (!sprintEnd || epicEndDate > sprintEnd) {
                sprintEnd = epicEndDate
              }
            }
          }
        })

        // Use sprint dates if available, otherwise use calculated dates
        if (!sprint.startDate && sprintStart) {
          sprint.startDate = sprintStart
        }
        if (!sprint.endDate && sprintEnd) {
          sprint.endDate = sprintEnd
        }
      }
    })

    // Filter out empty sprints (sprints with no children)
    return items.filter(sprint => sprint.children && sprint.children.length > 0)
  }, [tickets, sprints, epics])

  // Calculate timeline range
  const timelineRange = useMemo(() => {
    let minDate: Date | null = null
    let maxDate: Date | null = null

    const findDates = (items: GanttItem[]) => {
      items.forEach((item) => {
        if (item.startDate) {
          if (!minDate || item.startDate < minDate) {
            minDate = item.startDate
          }
        }
        if (item.endDate) {
          if (!maxDate || item.endDate > maxDate) {
            maxDate = item.endDate
          }
        }
        if (item.children) {
          findDates(item.children)
        }
      })
    }

    findDates(ganttData)

    // Default to last 3 months if no dates
    if (!minDate) {
      minDate = new Date()
      minDate.setMonth(minDate.getMonth() - 3)
    }
    if (!maxDate) {
      maxDate = new Date()
      maxDate.setMonth(maxDate.getMonth() + 3)
    }

    // Round to week boundaries
    minDate = startOfWeek(minDate, { weekStartsOn: 1 })
    maxDate = endOfWeek(maxDate, { weekStartsOn: 1 })

    return { minDate, maxDate }
  }, [ganttData])

  // Generate date headers
  const dateHeaders = useMemo(() => {
    const headers: Date[] = []
    let current = timelineRange.minDate
    while (current <= timelineRange.maxDate) {
      headers.push(current)
      current = addDays(current, 1)
    }
    return headers
  }, [timelineRange])

  const totalDays = differenceInDays(timelineRange.maxDate, timelineRange.minDate) + 1
  const timelineWidth = totalDays * DAY_WIDTH

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const getBarPosition = (startDate: Date | null, endDate: Date | null) => {
    if (!startDate || !endDate) return { left: 0, width: 0 }

    const daysFromStart = differenceInDays(startDate, timelineRange.minDate)
    const duration = differenceInDays(endDate, startDate) + 1

    return {
      left: daysFromStart * DAY_WIDTH,
      width: duration * DAY_WIDTH,
    }
  }

  const getStatusColor = (status: string | undefined, type: GanttItem["type"]) => {
    if (!status) return "#d1d5db"
    const normalizedStatus = normalizeStatusKey(status)
    if (type === "ticket") {
      return statusMap.get(normalizedStatus)?.color || "#9ca3af"
    }
    return SPRINT_STATUS_COLORS[normalizedStatus] || "#d1d5db"
  }

  const getStatusLabel = (status: string | undefined, type: GanttItem["type"]) => {
    if (!status) return ""
    if (type === "ticket") {
      const normalizedStatus = normalizeStatusKey(status)
      return statusMap.get(normalizedStatus)?.label || formatStatusLabel(status)
    }
    return formatStatusLabel(status)
  }

  const renderListRow = (item: GanttItem): JSX.Element => {
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.id}>
        <div
          className={cn(
            "flex items-center border-b border-border/50 hover:bg-muted/30 transition-colors group",
            item.type === "sprint" && "bg-muted/20 font-semibold",
            item.type === "epic" && "bg-muted/10"
          )}
          style={{ height: ROW_HEIGHT }}
          onClick={(e) => {
            // Only allow expand/collapse via the button, not by clicking the row
            // This prevents accidental collapsing when clicking on items
            e.stopPropagation()
          }}
        >
          <div style={{ width: INDENT_PER_LEVEL * item.level }} />
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 hover:bg-muted/50"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(item.id)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-5" />
          )}
          {item.type === "epic" && item.color && (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 mr-1.5 border border-border/30"
              style={{ backgroundColor: item.color }}
            />
          )}
          <span
            className={cn(
              "truncate flex-1",
              item.type === "sprint" && "text-lg font-semibold",
              item.type === "epic" && "text-base font-medium",
              item.type === "ticket" && "text-sm",
              (item.type === "ticket" && onTicketClick) || (item.type === "sprint" && onSprintClick)
                ? "cursor-pointer hover:text-primary transition-colors"
                : "cursor-default"
            )}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              if (item.type === "ticket" && onTicketClick) {
                onTicketClick(item.id)
              } else if (item.type === "sprint" && onSprintClick && item.id !== "no_sprint") {
                onSprintClick(item.id)
              }
            }}
          >
            {item.displayId && (
              <span className={cn(
                "font-mono text-muted-foreground mr-1.5",
                item.type === "sprint" ? "text-xs" : "text-xs"
              )}>
                {item.displayId}
              </span>
            )}
            {item.name}
          </span>
          {item.status && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs ml-2 flex-shrink-0 border-0 text-white",
                item.type === "sprint" && "font-medium"
              )}
              style={{ backgroundColor: getStatusColor(item.status, item.type) }}
            >
              {getStatusLabel(item.status, item.type)}
            </Badge>
          )}
        </div>
        {hasChildren && isExpanded && item.children!.map((child) => renderListRow(child))}
      </div>
    )
  }

  const renderTimelineRow = (item: GanttItem): JSX.Element => {
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = item.children && item.children.length > 0
    const barPosition = item.startDate && item.endDate 
      ? getBarPosition(item.startDate, item.endDate)
      : { left: 0, width: 0 }

    return (
      <div key={item.id}>
        <div
          className={cn(
            "relative border-b border-border/50",
            item.type === "sprint" && "bg-muted/20",
            item.type === "epic" && "bg-muted/10"
          )}
          style={{ height: ROW_HEIGHT }}
          onClick={(e) => {
            // Prevent any click events from bubbling up
            e.stopPropagation()
          }}
        >
          {barPosition.width > 0 && (
            <div
              className={cn(
                "absolute h-6 rounded-md top-1/2 -translate-y-1/2 flex items-center px-2 text-xs text-white font-medium transition-all",
                item.type === "sprint" && "opacity-70 hover:opacity-90 shadow-sm",
                item.type === "epic" && "opacity-85 hover:opacity-100 shadow-sm",
                item.type === "ticket" && "hover:shadow-md",
                (item.type === "ticket" && onTicketClick) || (item.type === "sprint" && onSprintClick)
                  ? "cursor-pointer"
                  : "cursor-default"
              )}
              style={{
                left: `${barPosition.left}px`,
                width: `${barPosition.width}px`,
                backgroundColor: item.type === "epic" && item.color 
                  ? item.color 
                  : item.type === "sprint"
                  ? "#6366f1"
                  : item.type === "ticket"
                  ? getStatusColor(item.status, "ticket")
                  : undefined,
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (item.type === "ticket" && onTicketClick) {
                  onTicketClick(item.id)
                } else if (item.type === "sprint" && onSprintClick && item.id !== "no_sprint") {
                  onSprintClick(item.id)
                }
              }}
            >
              {barPosition.width > 60 && (
                <span className="truncate font-medium">{item.name}</span>
              )}
            </div>
          )}
        </div>
        {hasChildren && isExpanded && item.children!.map((child) => renderTimelineRow(child))}
      </div>
    )
  }

  // Expand all sprints by default only on initial load, preserve state otherwise
  const hasInitialized = useRef(false)
  useEffect(() => {
    const sprintIds = ganttData.map(sprint => sprint.id)
    if (!hasInitialized.current && sprintIds.length > 0) {
      // Initial load: expand all sprints
      setExpandedItems(new Set(sprintIds))
      hasInitialized.current = true
    } else if (hasInitialized.current) {
      // After initial load: preserve existing expanded state, but add any new sprints
      setExpandedItems((prev) => {
        const next = new Set(prev)
        sprintIds.forEach(id => {
          if (!next.has(id)) {
            next.add(id)
          }
        })
        return next
      })
    }
  }, [ganttData])

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background shadow-sm">
      {/* Header */}
      <div className="flex border-b border-border bg-muted/40 flex-shrink-0">
        <div className="w-[320px] flex-shrink-0 border-r border-border px-4 py-2.5">
          <span className="text-sm font-semibold text-foreground">Task</span>
        </div>
        <div 
          className="horizontal-scroll flex-1 overflow-x-auto overflow-y-hidden" 
          ref={timelineRef}
          onScroll={(e) => {
            if (listRef.current) {
              listRef.current.scrollLeft = e.currentTarget.scrollLeft
            }
          }}
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="flex" style={{ width: timelineWidth, minWidth: "100%" }}>
            {dateHeaders.map((date, index) => {
              const isWeekStart = date.getDay() === 1
              const isMonthStart = date.getDate() === 1
              
              return (
                <div
                  key={index}
                  className={cn(
                    "flex-shrink-0 border-r border-border/40 text-center text-xs py-2",
                    isWeekStart && "bg-muted/30",
                    isMonthStart && "bg-muted/50 font-semibold"
                  )}
                  style={{ width: DAY_WIDTH }}
                >
                  {isWeekStart || isMonthStart ? (
                    <div>
                      <div className="font-medium text-foreground">{format(date, "MMM")}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{format(date, "d")}</div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground">{format(date, "d")}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-background">
        <div className="flex h-full">
          {/* List side - fixed width, scrollable vertically */}
          <div className="w-[320px] flex-shrink-0 border-r border-border/50 overflow-y-auto bg-background">
            {ganttData.map((item) => renderListRow(item))}
          </div>

          {/* Timeline side - scrollable horizontally and vertically */}
          <div
            className="no-scrollbar flex-1 overflow-x-hidden overflow-y-auto bg-muted/20"
            ref={listRef}
            onScroll={(e) => {
              // Sync horizontal scroll with header
              if (timelineRef.current) {
                timelineRef.current.scrollLeft = e.currentTarget.scrollLeft
              }
            }}
            style={{ scrollbarWidth: 'thin' }}
          >
            <div style={{ width: timelineWidth, minWidth: "100%" }}>
              {ganttData.map((item) => renderTimelineRow(item))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
