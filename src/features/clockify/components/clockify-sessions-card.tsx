"use client"

import { useMemo } from "react"
import { Link } from "react-router-dom"
import { getISOWeek, getISOWeekYear } from "date-fns"
import { Badge } from "@client/components/ui/badge"
import { EntityTableShell } from "@client/components/ui/entity-table-shell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table"
import type { ClockifyReportSession } from "@client/hooks/use-clockify"

function formatYearWeek(startDate: string): string {
  const date = new Date(`${startDate}T00:00:00Z`)
  const year = getISOWeekYear(date)
  const week = getISOWeek(date)
  return `${year} ${String(week).padStart(2, "0")}`
}

function yearWeekSortKey(startDate: string): number {
  const date = new Date(`${startDate}T00:00:00Z`)
  return getISOWeekYear(date) * 100 + getISOWeek(date)
}

type ClockifySessionsCardProps = {
  isLoading: boolean
  sessions: ClockifyReportSession[]
  formatRangeLabel: (startDate: string, endDate: string) => string
}

export function ClockifySessionsCard({
  isLoading,
  sessions,
  formatRangeLabel,
}: ClockifySessionsCardProps) {
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => yearWeekSortKey(b.start_date) - yearWeekSortKey(a.start_date)),
    [sessions]
  )

  if (isLoading) return null
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">No report sessions yet.</p>
      </div>
    )
  }

  return (
    <EntityTableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 py-2">Year Week</TableHead>
            <TableHead className="h-9 py-2">Range</TableHead>
            <TableHead className="h-9 py-2">Status</TableHead>
            <TableHead className="h-9 py-2">Synced at</TableHead>
            <TableHead className="h-9 py-2">Synced by</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell className="py-2 text-sm font-mono">
                <Link
                  to={`/clockify/sessions/${session.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {formatYearWeek(session.start_date)}
                </Link>
              </TableCell>
              <TableCell className="py-2 text-sm">
                {formatRangeLabel(session.start_date, session.end_date)}
              </TableCell>
              <TableCell className="py-2">
                <Badge variant={session.status === "success" ? "default" : "destructive"}>
                  {session.status}
                </Badge>
              </TableCell>
              <TableCell className="py-2 text-sm">
                {new Date(session.fetched_at).toLocaleString()}
              </TableCell>
              <TableCell className="py-2 text-sm text-muted-foreground">
                {session.requested_by?.name ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </EntityTableShell>
  )
}
