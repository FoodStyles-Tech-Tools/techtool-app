"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { getDefaultReportDateRange } from "@shared/report-date-range"
import { PageLayout } from "@client/components/ui/page-layout"
import { PageHeader } from "@client/components/ui/page-header"
import { Button } from "@client/components/ui/button"
import { Input } from "@client/components/ui/input"
import { Label } from "@client/components/ui/label"
import { EntityTableShell } from "@client/components/ui/entity-table-shell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { toast } from "@client/components/ui/toast"
import {
  buildDateRangePayload,
  createSession,
  fetchSessions,
  formatSessionLabel,
} from "@client/features/report/lib/client"
import type { ReportSession } from "@shared/types/api/report"

function sessionDateRange(session: ReportSession): string {
  const start = format(new Date(session.date_range_start), "yyyy-MM-dd")
  const end = format(new Date(session.date_range_end), "yyyy-MM-dd")
  return `${start} – ${end}`
}

function sessionDisplayName(session: ReportSession): string {
  return session.name?.trim() || sessionDateRange(session)
}

export default function ReportSessionsListClient() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createStartDate, setCreateStartDate] = useState("")
  const [createEndDate, setCreateEndDate] = useState("")

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["report-sessions"],
    queryFn: fetchSessions,
  })

  const createMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ["report-sessions"] })
      setIsCreateDialogOpen(false)
      toast("Report session created.", "success")
      navigate(`/report/sessions/${newSession.id}`)
    },
    onError: (error: Error) => toast(error.message, "error"),
  })

  const openCreateSessionDialog = () => {
    const { start, end } = getDefaultReportDateRange()
    setCreateName("")
    setCreateStartDate(format(start, "yyyy-MM-dd"))
    setCreateEndDate(format(end, "yyyy-MM-dd"))
    setIsCreateDialogOpen(true)
  }

  const handleCreateSession = () => {
    try {
      const range = buildDateRangePayload(createStartDate, createEndDate)
      createMutation.mutate({
        name: createName.trim() || null,
        ...range,
      })
    } catch (error) {
      toast(error instanceof Error ? error.message : "Invalid date range.", "error")
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title="Guild Lead Report"
        description="Ticket analytics by date range. Create a report session or open one to view volume, requesters, status, and lead time."
        actions={
          <Button type="button" onClick={openCreateSessionDialog}>
            <Plus className="h-4 w-4" />
            Add session
          </Button>
        }
      />

      <EntityTableShell>
        {sessionsLoading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-500">
              No report sessions yet. Create one to get a default range of the latest 5 completed
              weeks (ISO week), or customize the range before creating.
            </p>
            <Button className="mt-3" variant="outline" size="sm" onClick={openCreateSessionDialog}>
              <Plus className="h-4 w-4" />
              Add session
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Date range</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <Link
                      to={`/report/sessions/${session.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {sessionDisplayName(session)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {sessionDateRange(session)}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {format(new Date(session.created_at), "yyyy-MM-dd")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </EntityTableShell>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add session</DialogTitle>
            <DialogDescription>
              Choose a date range for this report session. Default is the latest 5 completed ISO
              weeks (excluding current week).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="create-session-name">Session name (optional)</Label>
              <Input
                id="create-session-name"
                placeholder="e.g. Jan triage review"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="create-range-start">Start date</Label>
                <Input
                  id="create-range-start"
                  type="date"
                  value={createStartDate}
                  onChange={(event) => setCreateStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-range-end">End date</Label>
                <Input
                  id="create-range-end"
                  type="date"
                  value={createEndDate}
                  onChange={(event) => setCreateEndDate(event.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSession} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
