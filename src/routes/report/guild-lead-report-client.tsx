"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { PlusIcon } from "@heroicons/react/20/solid"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { getDefaultReportDateRange } from "@shared/report-date-range"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card"
import { Button } from "@client/components/ui/button"
import { PageLayout } from "@client/components/ui/page-layout"
import { PageHeader } from "@client/components/ui/page-header"
import { toast } from "@client/components/ui/toast"
import { Input } from "@client/components/ui/input"
import { Label } from "@client/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import { ConfirmDialog } from "@client/components/ui/confirm-dialog"
import { ChartWithInsight } from "@client/features/report/components/insight-editor"
import {
  buildDateRangePayload,
  createSession,
  deleteSession,
  fetchReportData,
  fetchSessions,
  formatSessionLabel,
  nativeSelectClassName,
  parseInsights,
  toDateInputValue,
  updateSession,
} from "@client/features/report/lib/client"
import {
  ReportVolumeChart,
  ReportStatusCards,
  ReportRequesterChart,
  ReportResponseTimeChart,
  ReportLeadTimeChart,
} from "./report-charts"
import type { ReportInsightKey } from "@shared/types/api/report"

export default function GuildLeadReportClient() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createStartDate, setCreateStartDate] = useState("")
  const [createEndDate, setCreateEndDate] = useState("")
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["report-sessions"],
    queryFn: fetchSessions,
  })

  useEffect(() => {
    const sessionIdFromQuery = searchParams.get("sessionId")

    if (sessionIdFromQuery && sessions.some((session) => session.id === sessionIdFromQuery)) {
      if (selectedSessionId !== sessionIdFromQuery) {
        setSelectedSessionId(sessionIdFromQuery)
      }
      return
    }

    if (sessions.length === 0) {
      if (selectedSessionId) setSelectedSessionId(null)
      return
    }

    if (!selectedSessionId || !sessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(sessions[0].id)
    }
  }, [searchParams, selectedSessionId, sessions])

  useEffect(() => {
    const current = searchParams.get("sessionId")
    if (selectedSessionId) {
      if (current === selectedSessionId) return
      const next = new URLSearchParams(searchParams)
      next.set("sessionId", selectedSessionId)
      setSearchParams(next, { replace: true })
      return
    }

    if (current) {
      const next = new URLSearchParams(searchParams)
      next.delete("sessionId")
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, selectedSessionId, setSearchParams])

  const { data: session } = useQuery({
    queryKey: ["report-session", selectedSessionId],
    queryFn: () =>
      fetch(`/api/report/sessions/${selectedSessionId}`).then((response) => {
        if (!response.ok) throw new Error("Not found")
        return response.json()
      }),
    enabled: !!selectedSessionId,
  })

  useEffect(() => {
    if (!session) {
      setEditName("")
      setEditStartDate("")
      setEditEndDate("")
      return
    }

    setEditName(session.name ?? "")
    setEditStartDate(toDateInputValue(session.date_range_start))
    setEditEndDate(toDateInputValue(session.date_range_end))
  }, [session])

  const { data: reportData, isLoading: dataLoading } = useQuery({
    queryKey: ["report-data", selectedSessionId],
    queryFn: () => fetchReportData(selectedSessionId!),
    enabled: !!selectedSessionId,
  })

  const createMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ["report-sessions"] })
      queryClient.invalidateQueries({ queryKey: ["report-session", newSession.id] })
      setSelectedSessionId(newSession.id)
      setIsCreateDialogOpen(false)
      toast("Report session created.", "success")
    },
    onError: (error: Error) => toast(error.message, "error"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateSession>[1] }) =>
      updateSession(id, body),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["report-sessions"] })
      queryClient.invalidateQueries({ queryKey: ["report-session", id] })
      queryClient.invalidateQueries({ queryKey: ["report-data", id] })
      toast("Session updated.", "success")
    },
    onError: (error: Error) => toast(error.message, "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["report-sessions"] })
      queryClient.removeQueries({ queryKey: ["report-session", deletedId] })
      queryClient.removeQueries({ queryKey: ["report-data", deletedId] })
      if (selectedSessionId === deletedId) {
        setSelectedSessionId(null)
      }
      toast("Session deleted.", "success")
    },
    onError: (error: Error) => toast(error.message, "error"),
  })

  const insights = useMemo(() => (session ? parseInsights(session.insights) : {}), [session])

  const sessionStartDate = session ? toDateInputValue(session.date_range_start) : ""
  const sessionEndDate = session ? toDateInputValue(session.date_range_end) : ""
  const sessionName = session?.name ?? ""
  const rangeDirty =
    !!session &&
    !!editStartDate &&
    !!editEndDate &&
    (editName !== sessionName || editStartDate !== sessionStartDate || editEndDate !== sessionEndDate)

  const handleSaveInsight = useCallback(
    (key: ReportInsightKey, html: string) => {
      if (!selectedSessionId) return
      const next = { ...insights, [key]: html || null }
      updateMutation.mutate({
        id: selectedSessionId,
        body: { insights: JSON.stringify(next) },
      })
    },
    [selectedSessionId, insights, updateMutation]
  )

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

  const handleSaveSessionConfig = () => {
    if (!selectedSessionId) return
    try {
      const range = buildDateRangePayload(editStartDate, editEndDate)
      updateMutation.mutate({
        id: selectedSessionId,
        body: {
          name: editName.trim() || null,
          ...range,
        },
      })
    } catch (error) {
      toast(error instanceof Error ? error.message : "Invalid date range.", "error")
    }
  }

  const handleDeleteSession = () => {
    if (!selectedSessionId) return
    setConfirmDeleteOpen(true)
  }

  const hasSession = sessions.length > 0
  const showSessionView = !!selectedSessionId && !!session

  return (
    <PageLayout>
      <PageHeader title="Guild Lead Report" />

      <Card className="border-border shadow-none">
        <CardHeader className="border-b border-border bg-muted">
          <CardTitle>Report Session</CardTitle>
          <CardDescription>
            Create a report session to analyze tickets by date range. Each session has its own date
            range, filters, and insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">Session</span>
            {sessionsLoading ? null : (
              <>
                <select
                  value={selectedSessionId ?? ""}
                  onChange={(event) => setSelectedSessionId(event.target.value || null)}
                  className={`${nativeSelectClassName} w-[min(100%,360px)]`}
                >
                  <option value="">Select or create a session</option>
                  {sessions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {formatSessionLabel(item)}
                    </option>
                  ))}
                </select>
                <Button variant="outline" size="sm" onClick={openCreateSessionDialog}>
                  <PlusIcon className="h-4 w-4" />
                  New session
                </Button>
              </>
            )}
          </div>

          {!hasSession && !sessionsLoading ? (
            <p className="text-sm text-muted-foreground">
              No report sessions yet. Create one to get a default range of the latest 5 completed
              weeks (ISO week), or customize the range before creating.
            </p>
          ) : null}

          {showSessionView ? (
            <div className="rounded-md border border-border bg-card p-3 sm:p-4">
              <div className="space-y-3">
                <div className="space-y-1 sm:max-w-md">
                  <Label htmlFor="session-name">Session name</Label>
                  <Input
                    id="session-name"
                    placeholder="Give this session a name"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
                  <div className="space-y-1">
                    <Label htmlFor="session-range-start">Start date</Label>
                    <Input
                      id="session-range-start"
                      type="date"
                      value={editStartDate}
                      onChange={(event) => setEditStartDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="session-range-end">End date</Label>
                    <Input
                      id="session-range-end"
                      type="date"
                      value={editEndDate}
                      onChange={(event) => setEditEndDate(event.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSaveSessionConfig}
                    disabled={!rangeDirty || updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save session"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSession}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Update name/date range and save to refresh all charts in this session.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {showSessionView ? (
        <>
          {dataLoading ? (
            <div className="rounded-md border border-border bg-card py-12" />
          ) : reportData ? (
            <div className="space-y-6">
              <ChartWithInsight
                title="Volume Ticket"
                insight={insights.volume ?? ""}
                onSave={(html) => handleSaveInsight("volume", html)}
                saving={updateMutation.isPending}
              >
                <ReportVolumeChart data={reportData.volumeByWeek} />
              </ChartWithInsight>

              <ChartWithInsight
                title="Current Status"
                insight={insights.status ?? ""}
                onSave={(html) => handleSaveInsight("status", html)}
                saving={updateMutation.isPending}
              >
                <ReportStatusCards data={reportData.statusCounts} />
              </ChartWithInsight>

              <ChartWithInsight
                title="Requester Analysis"
                insight={insights.requester ?? ""}
                onSave={(html) => handleSaveInsight("requester", html)}
                saving={updateMutation.isPending}
              >
                <ReportRequesterChart data={reportData.requesters} />
              </ChartWithInsight>

              <ChartWithInsight
                title="Average Response Time"
                insight={insights.responseTime ?? ""}
                onSave={(html) => handleSaveInsight("responseTime", html)}
                saving={updateMutation.isPending}
              >
                <ReportResponseTimeChart data={reportData.avgResponseTimeByWeek} />
              </ChartWithInsight>

              <ChartWithInsight
                title="Average Lead Time"
                insight={insights.leadTime ?? ""}
                onSave={(html) => handleSaveInsight("leadTime", html)}
                saving={updateMutation.isPending}
              >
                <ReportLeadTimeChart data={reportData.avgLeadTimeByWeek} />
              </ChartWithInsight>
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete report session?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        confirming={deleteMutation.isPending}
        onConfirm={() => {
          if (selectedSessionId) {
            deleteMutation.mutate(selectedSessionId)
          }
        }}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Report Session</DialogTitle>
            <DialogDescription>
              Default date range is latest 5 completed ISO weeks (excluding current week). You can
              customize before creating.
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
              {createMutation.isPending ? "Creating..." : "Create session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
