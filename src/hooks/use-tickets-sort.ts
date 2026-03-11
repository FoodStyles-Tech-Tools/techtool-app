"use client"

import { useState, useCallback, useMemo } from "react"
import type { Ticket } from "@lib/types"
import { PRIORITY_ORDER, type SortColumn } from "@lib/ticket-constants"

const SERVER_SORT_COLUMNS = new Set<SortColumn>([
  "id",
  "title",
  "due_date",
  "type",
  "status",
  "priority",
  "sqa_assigned_at",
])

export function useTicketsSort(filteredTickets: Ticket[]) {
  const [sortConfig, setSortConfig] = useState<{
    column: SortColumn
    direction: "asc" | "desc"
  }>({ column: "due_date", direction: "asc" })

  const comparePriority = useCallback((a: Ticket, b: Ticket) => {
    const weightA = PRIORITY_ORDER[(a.priority || "").toLowerCase()] ?? 5
    const weightB = PRIORITY_ORDER[(b.priority || "").toLowerCase()] ?? 5
    return weightA - weightB
  }, [])

  const compareDueDate = useCallback((a: Ticket, b: Ticket) => {
    const getTime = (value?: string | null) => {
      if (!value) return null
      const date = new Date(value)
      const time = date.getTime()
      return Number.isNaN(time) ? null : time
    }
    const timeA = getTime(a.dueDate)
    const timeB = getTime(b.dueDate)
    if (timeA === null && timeB === null) return 0
    if (timeA === null) return 1
    if (timeB === null) return -1
    return timeA - timeB
  }, [])

  const sortedTickets = useMemo(() => {
    if (SERVER_SORT_COLUMNS.has(sortConfig.column)) {
      return filteredTickets
    }

    const tickets = [...filteredTickets]
    tickets.sort((a, b) => {
      let result = 0
      switch (sortConfig.column) {
        case "id":
          result = (a.displayId || a.id).localeCompare(
            b.displayId || b.id,
            undefined,
            { numeric: true, sensitivity: "base" }
          )
          break
        case "title":
          result = a.title.localeCompare(b.title)
          break
        case "due_date":
          result = compareDueDate(a, b)
          if (result === 0) result = comparePriority(a, b)
          break
        case "type":
          result = (a.type || "").localeCompare(b.type || "")
          break
        case "department":
          result = (a.department?.name || "").localeCompare(b.department?.name || "")
          break
        case "status":
          result = (a.status || "").localeCompare(b.status || "")
          break
        case "priority":
          result = comparePriority(a, b)
          break
        case "requested_by":
          result = (a.requestedBy?.name || a.requestedBy?.email || "").localeCompare(
            b.requestedBy?.name || b.requestedBy?.email || ""
          )
          break
        case "assignee":
          result = (a.assignee?.name || a.assignee?.email || "").localeCompare(
            b.assignee?.name || b.assignee?.email || ""
          )
          break
        case "sqa_assignee":
          result = (a.sqaAssignee?.name || a.sqaAssignee?.email || "").localeCompare(
            b.sqaAssignee?.name || b.sqaAssignee?.email || ""
          )
          break
        case "sqa_assigned_at": {
          const aTime = a.sqaAssignedAt ? new Date(a.sqaAssignedAt).getTime() : null
          const bTime = b.sqaAssignedAt ? new Date(b.sqaAssignedAt).getTime() : null
          if (aTime === null && bTime === null) result = 0
          else if (aTime === null) result = 1
          else if (bTime === null) result = -1
          else result = aTime - bTime
          break
        }
        default:
          result = 0
      }
      if (result === 0) {
        const dueComparison = compareDueDate(a, b)
        result = dueComparison !== 0 ? dueComparison : comparePriority(a, b)
      }
      return sortConfig.direction === "asc" ? result : -result
    })
    return tickets
  }, [filteredTickets, sortConfig, compareDueDate, comparePriority])

  const handleSort = useCallback((column: SortColumn) => {
    setSortConfig((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" }
    )
  }, [])

  return {
    sortConfig,
    handleSort,
    sortedTickets,
    isServerSort: SERVER_SORT_COLUMNS.has(sortConfig.column),
    serverSortBy: SERVER_SORT_COLUMNS.has(sortConfig.column) ? sortConfig.column : undefined,
    serverSortDirection: SERVER_SORT_COLUMNS.has(sortConfig.column) ? sortConfig.direction : undefined,
  }
}
