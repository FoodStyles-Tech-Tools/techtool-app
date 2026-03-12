"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { ArrowLeftIcon, PencilIcon } from "@heroicons/react/20/solid"
import { Button } from "@client/components/ui/button"
import { PageLayout } from "@client/components/ui/page-layout"
import { PageHeader } from "@client/components/ui/page-header"
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
import { toast } from "@client/components/ui/toast"
import { ChartWithInsight } from "@client/features/report/components/insight-editor"
import {
  buildDateRangePayload,
  deleteSession,
  fetchReportData,
  toDateInputValue,
  parseInsights,
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

async function fetchSession(sessionId: string) {
  const res = await fetch(`/api/report/sessions/${sessionId}`)
  if (!res.ok) throw new Error("Not found")
  return res.json()
}

export default function ReportSessionDetailClient() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editSessionModalOpen, setEditSessionModalOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")

  const {
    data: session,
    isLoading: sessionLoading,
    isError: sessionError,
  } = useQuery({
    queryKey: ["report-session", sessionId],
    queryFn: () => fetchSession(sessionId!),
    enabled: !!sessionId,
  })

  useEffect(() => {
    if (sessionError || (sessionId && !sessionLoading && !session)) {
      navigate("/report", { replace: true })
    }
  }, [sessionError, sessionId, sessionLoading, session, navigate])

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
    queryKey: ["report-data", sessionId],
    queryFn: () => fetchReportData(sessionId!),
    enabled: !!sessionId && !!session,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateSession>[1] }) =>
      updateSession(id, body),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["report-sessions"] })
      queryClient.invalidateQueries({ queryKey: ["report-session", id] })
      queryClient.invalidateQueries({ queryKey: ["report-data", id] })
      toast("Session updated.", "success")
      setEditSessionModalOpen(false)
    },
    onError: (error: Error) => toast(error.message, "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["report-sessions"] })
      queryClient.removeQueries({ queryKey: ["report-session", deletedId] })
      queryClient.removeQueries({ queryKey: ["report-data", deletedId] })
      toast("Session deleted.", "success")
      navigate("/report", { replace: true })
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
      if (!sessionId) return
      const next = { ...insights, [key]: html || null }
      updateMutation.mutate({
        id: sessionId,
        body: { insights: JSON.stringify(next) },
      })
    },
    [sessionId, insights, updateMutation]
  )

  const handleSaveSessionConfig = () => {
    if (!sessionId) return
    try {
      const range = buildDateRangePayload(editStartDate, editEndDate)
      updateMutation.mutate({
        id: sessionId,
        body: {
          name: editName.trim() || null,
          ...range,
        },
      })
    } catch (error) {
      toast(error instanceof Error ? error.message : "Invalid date range.", "error")
    }
  }

  if (!sessionId || sessionLoading || sessionError || !session) {
    return (
      <PageLayout>
        <div className="py-12 text-center text-sm text-slate-500">Loading…</div>
      </PageLayout>
    )
  }

  const pageTitle = session.name?.trim() || `${format(new Date(session.date_range_start), "yyyy-MM-dd")} – ${format(new Date(session.date_range_end), "yyyy-MM-dd")}`

  return (
    <PageLayout>
      <PageHeader
        title={pageTitle}
        description="Ticket analytics for this report session. Update the date range and save to refresh charts."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditSessionModalOpen(true)}
            >
              <PencilIcon className="h-4 w-4" />
              Edit session
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/report">
                <ArrowLeftIcon className="h-4 w-4" />
                Back to sessions
              </Link>
            </Button>
          </>
        }
      />

      <div className="rounded-md border border-slate-200 bg-white px-4 py-3 sm:px-5">
        <h2 className="text-base font-semibold">Charts</h2>
        <p className="mt-1 text-sm text-slate-500">
          Date range: {format(new Date(session.date_range_start), "yyyy-MM-dd")} –{" "}
          {format(new Date(session.date_range_end), "yyyy-MM-dd")} (session range, ISO week
          grouped)
        </p>
      </div>

      {dataLoading ? (
        <div className="rounded-md border border-slate-200 bg-white py-12" />
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

      <Dialog open={editSessionModalOpen} onOpenChange={setEditSessionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit session</DialogTitle>
            <DialogDescription>
              Edit name and date range for this report. Saving refreshes all charts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="modal-session-name">Session name</Label>
              <Input
                id="modal-session-name"
                placeholder="Give this session a name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="modal-session-range-start">Start date</Label>
                <Input
                  id="modal-session-range-start"
                  type="date"
                  value={editStartDate}
                  onChange={(event) => setEditStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="modal-session-range-end">End date</Label>
                <Input
                  id="modal-session-range-end"
                  type="date"
                  value={editEndDate}
                  onChange={(event) => setEditEndDate(event.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Update name/date range and save to refresh all charts in this session.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setEditSessionModalOpen(false)
                setConfirmDeleteOpen(true)
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditSessionModalOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSessionConfig}
              disabled={!rangeDirty || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete report session?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        confirming={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(sessionId)}
      />
    </PageLayout>
  )
}
