"use client"

import { Link } from "react-router-dom"
import { Badge } from "@client/components/ui/badge"
import { Button } from "@client/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table"
import type { ClockifyReportSession } from "@client/hooks/use-clockify"

type ClockifySessionsCardProps = {
  isLoading: boolean
  sessions: ClockifyReportSession[]
  onDeleteSession: (sessionId: string) => void
  formatRangeLabel: (startDate: string, endDate: string) => string
}

export function ClockifySessionsCard({
  isLoading,
  sessions,
  onDeleteSession,
  formatRangeLabel,
}: ClockifySessionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
        <CardDescription>Every time a report is fetched, a session is saved here.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <div className="rounded-lg border p-6 text-center">
            <p className="text-sm text-slate-500">No report sessions yet.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 py-2 text-xs">Fetched At</TableHead>
                  <TableHead className="h-9 py-2 text-xs">Range</TableHead>
                  <TableHead className="h-9 py-2 text-xs">Status</TableHead>
                  <TableHead className="h-9 py-2 text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="py-2 text-sm">
                      {new Date(session.fetched_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2 text-sm">
                      {formatRangeLabel(session.start_date, session.end_date)}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant={session.status === "success" ? "default" : "destructive"}>
                        {session.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" asChild>
                          <Link
                            to={`/clockify/sessions/${session.id}`}
                            aria-label="View report session"
                          >
                            View
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteSession(session.id)}
                          aria-label="Delete report session"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
