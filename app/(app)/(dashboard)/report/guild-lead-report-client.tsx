"use client"

import { useState, useCallback, useEffect, type ReactNode } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { Loader2, PlusCircle, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { getDefaultReportDateRange } from "@/lib/report-date-range"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ReportVolumeChart,
  ReportStatusCards,
  ReportRequesterChart,
  ReportResponseTimeChart,
  ReportLeadTimeChart,
} from "./report-charts"
import type {
  ReportSession,
  ReportDataPayload,
  ReportSessionInsights,
  ReportInsightKey,
} from "@/types/api/report"

const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor").then((mod) => mod.RichTextEditor),
  { ssr: false }
)

type CreateSessionBody = {
  name?: string | null
  date_range_start?: string
  date_range_end?: string
  filters?: object
}

async function fetchSessions(): Promise<ReportSession[]> {
  const res = await fetch("/api/report/sessions")
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to load sessions")
  }
  return res.json()
}

async function createSession(body: CreateSessionBody): Promise<ReportSession> {
  const res = await fetch("/api/report/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to create session")
  }
  return res.json()
}

async function updateSession(
  id: string,
  body: {
    name?: string | null
    date_range_start?: string
    date_range_end?: string
    filters?: object
    insights?: string | null
  }
): Promise<ReportSession> {
  const res = await fetch(`/api/report/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to update session")
  }
  return res.json()
}

async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/report/sessions/${id}`, { method: "DELETE" })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to delete session")
  }
}

async function fetchReportData(sessionId: string): Promise<ReportDataPayload> {
  const res = await fetch(`/api/report/sessions/${sessionId}/data`)
  if (!res.ok) {
    if (res.status === 404) throw new Error("Session not found")
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || "Failed to load report data")
  }
  return res.json()
}

function formatSessionLabel(s: ReportSession): string {
  const start = format(new Date(s.date_range_start), "yyyy-MM-dd")
  const end = format(new Date(s.date_range_end), "yyyy-MM-dd")
  return s.name ? `${s.name} (${start} - ${end})` : `${start} - ${end}`
}

function toDateInputValue(value: string): string {
  return format(new Date(value), "yyyy-MM-dd")
}

function buildDateRangePayload(startDate: string, endDate: string): {
  date_range_start: string
  date_range_end: string
} {
  if (!startDate || !endDate) throw new Error("Start and end dates are required.")

  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T23:59:59.999Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date range.")
  }
  if (start.getTime() > end.getTime()) {
    throw new Error("Start date cannot be after end date.")
  }
  return {
    date_range_start: start.toISOString(),
    date_range_end: end.toISOString(),
  }
}

const INSIGHT_KEYS: ReportInsightKey[] = ["volume", "requester", "status", "responseTime", "leadTime"]

function parseInsights(insights: string | null): ReportSessionInsights {
  if (!insights?.trim()) return {}
  try {
    const parsed = JSON.parse(insights) as Record<string, unknown>
    const out: ReportSessionInsights = {}
    for (const key of INSIGHT_KEYS) {
      const value = parsed[key]
      out[key] = typeof value === "string" ? value : null
    }
    return out
  } catch {
    return {}
  }
}

export default function GuildLeadReportClient() {
  const queryClient = useQueryClient()
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createStartDate, setCreateStartDate] = useState("")
  const [createEndDate, setCreateEndDate] = useState("")
  const [editName, setEditName] = useState("")
  const [editStartDate, setEditStartDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["report-sessions"],
    queryFn: fetchSessions,
  })

  useEffect(() => {
    if (sessions.length === 0) {
      if (selectedSessionId) setSelectedSessionId(null)
      return
    }
    if (!selectedSessionId || !sessions.some((s) => s.id === selectedSessionId)) {
      setSelectedSessionId(sessions[0].id)
    }
  }, [sessions, selectedSessionId])

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
  }, [session?.id, session?.name, session?.date_range_start, session?.date_range_end])

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

  const insights = session ? parseInsights(session.insights) : {}

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
    const ok = window.confirm("Delete this report session? This cannot be undone.")
    if (!ok) return
    deleteMutation.mutate(selectedSessionId)
  }

  const hasSession = sessions.length > 0
  const showSessionView = !!selectedSessionId && !!session

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Guild Lead Report</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Ticket analytics by date range: volume, requesters, status, response time, and lead time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Session</CardTitle>
          <CardDescription>
            Create a report session to analyze tickets by date range. Each session has its own date
            range, filters, and insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">Session</span>
            {sessionsLoading ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : (
              <>
                <Select
                  value={selectedSessionId ?? ""}
                  onValueChange={(value) => setSelectedSessionId(value || null)}
                >
                  <SelectTrigger className="w-[min(100%,360px)]">
                    <SelectValue placeholder="Select or create a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {formatSessionLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={openCreateSessionDialog}>
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  New session
                </Button>
              </>
            )}
          </div>

          {!hasSession && !sessionsLoading && (
            <p className="text-sm text-muted-foreground">
              No report sessions yet. Create one to get a default range of the latest 5 completed
              weeks (ISO week), or customize the range before creating.
            </p>
          )}

          {showSessionView && (
            <div className="rounded-lg border bg-muted/15 p-3 sm:p-4">
              <div className="space-y-3">
                <div className="space-y-1 sm:max-w-md">
                  <Label htmlFor="session-name">Session name</Label>
                  <Input
                    id="session-name"
                    placeholder="Give this session a name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
                <div className="space-y-1">
                  <Label htmlFor="session-range-start">Start date</Label>
                  <Input
                    id="session-range-start"
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="session-range-end">End date</Label>
                  <Input
                    id="session-range-end"
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveSessionConfig}
                  disabled={!rangeDirty || updateMutation.isPending}
                >
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save session"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSession}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Update name/date range and save to refresh all charts in this session.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {showSessionView && (
        <>
          <div className="rounded-lg border bg-gradient-to-br from-card to-muted/30 px-4 py-3 sm:px-5">
            <h2 className="text-lg font-semibold tracking-tight">Charts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Date range: {format(new Date(session.date_range_start), "yyyy-MM-dd")} -{" "}
              {format(new Date(session.date_range_end), "yyyy-MM-dd")} (session range, ISO week
              grouped)
            </p>
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center rounded-lg border bg-muted/30 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
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
      )}

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
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="create-range-start">Start date</Label>
                <Input
                  id="create-range-start"
                  type="date"
                  value={createStartDate}
                  onChange={(e) => setCreateStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="create-range-end">End date</Label>
                <Input
                  id="create-range-end"
                  type="date"
                  value={createEndDate}
                  onChange={(e) => setCreateEndDate(e.target.value)}
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
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create session"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChartWithInsight({
  title,
  insight,
  onSave,
  saving,
  children,
}: {
  title: string
  insight: string
  onSave: (html: string) => void
  saving: boolean
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      {children}
      <div className="rounded-lg border bg-muted/10 p-3 sm:p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium">Insights - {title}</h4>
          <p className="text-xs text-muted-foreground">
            Summarize trends, anomalies, and actions based on the chart.
          </p>
        </div>
        <InsightEditor
          value={insight}
          onSave={onSave}
          saving={saving}
          placeholder={`Add insights for ${title}...`}
        />
      </div>
    </section>
  )
}

function InsightEditor({
  value,
  onSave,
  saving,
  placeholder = "Add insights...",
}: {
  value: string
  onSave: (html: string) => void
  saving: boolean
  placeholder?: string
}) {
  const [localValue, setLocalValue] = useState(value)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!dirty) setLocalValue(value)
  }, [value, dirty])

  const handleChange = (html: string) => {
    setLocalValue(html)
    setDirty(html !== value)
  }

  const handleSave = () => {
    if (!dirty) return
    onSave(localValue)
    setDirty(false)
  }

  return (
    <div className="space-y-3">
      <RichTextEditor
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        compact
        minHeight={120}
        showToolbarOnFocus
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{dirty ? "Unsaved changes" : "No pending changes"}</p>
        <Button size="sm" onClick={handleSave} disabled={!dirty || saving} className="min-w-[112px]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save insight"}
        </Button>
      </div>
    </div>
  )
}
