"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { PageLayout } from "@/components/ui/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormDialogShell } from "@/components/ui/form-dialog-shell"
import { TicketForm } from "@/components/forms/ticket-form"
import { toast } from "@/components/ui/toast"
import { usePermissions } from "@/hooks/use-permissions"
import { useProjects } from "@/hooks/use-projects"
import {
  ClockifyReportSession,
  useClockifySessions,
  useCreateClockifySession,
} from "@/hooks/use-clockify"
import { ClockifySessionsCard } from "@/features/clockify/components/clockify-sessions-card"
import { ClockifyReportSessionCard } from "@/features/clockify/components/clockify-report-session-card"
import {
  extractTicketIdFromEntry,
  formatDurationHours,
  formatRangeLabel,
  getEntryId,
  getEntryTitle,
  getWeekRange,
  matchesCustomField,
  nativeSelectClassName,
  normalizeTicketId,
} from "@/features/clockify/lib/client"
import type {
  ClockifyConfirmDialogState,
  ClockifyReconcileEntry,
  ClockifyReportEntry,
  ClockifyTicketLookupItem,
} from "@/features/clockify/types"

export default function ClockifyClient() {
  const queryClient = useQueryClient()
  const { flags, user: currentUser } = usePermissions()
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>()
  const isAdmin = currentUser?.role?.toLowerCase() === "admin"
  const canManageClockify = flags?.canManageClockify ?? false
  const canCreateTickets = flags?.canCreateTickets ?? false
  const canManageSessions = canManageClockify
  const [searchParams] = useSearchParams()

  const [weekOffset, setWeekOffset] = useState(1)
  const [selectedSession, setSelectedSession] = useState<ClockifyReportSession | null>(null)
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [reconcileMap, setReconcileMap] = useState<Record<string, ClockifyReconcileEntry>>({})
  const reconcileMapRef = useRef(reconcileMap)
  const [isSavingReconcile, setIsSavingReconcile] = useState(false)
  const [isReconciling, setIsReconciling] = useState(false)
  const [ticketLookup, setTicketLookup] = useState<Record<string, ClockifyTicketLookupItem>>({})
  const [activeTicketEntryId, setActiveTicketEntryId] = useState<string | null>(null)
  const [ticketSearchTerm, setTicketSearchTerm] = useState<string>("")
  const [ticketSearchResults, setTicketSearchResults] = useState<ClockifyTicketLookupItem[]>([])
  const [isTicketSearchLoading, setIsTicketSearchLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ClockifyConfirmDialogState>(null)
  const [reportLoadingAction, setReportLoadingAction] = useState<"fetch" | "reupload" | null>(null)
  const [createTicketDialog, setCreateTicketDialog] = useState<{
    entryId: string
    title: string
    createdAt: string | null
  } | null>(null)
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)

  const { startDate, endDate } = useMemo(() => getWeekRange(weekOffset), [weekOffset])
  const rangeLabel = useMemo(
    () => formatRangeLabel(startDate, endDate),
    [startDate, endDate]
  )

  const { data: sessions = [], isLoading } = useClockifySessions()
  const createSession = useCreateClockifySession()
  const { data: projectOptions = [] } = useProjects({
    enabled: !!createTicketDialog,
    realtime: false,
  })

  const handleFetchReport = async () => {
    if (!isAdmin) {
      toast("Only admins can fetch Clockify reports.", "error")
      return
    }
    setReportLoadingAction("fetch")
    try {
      await createSession.mutateAsync({ startDate, endDate })
      toast("Clockify report fetched.", "success")
    } catch (error) {
      console.error("Clockify fetch failed:", error)
      toast("Failed to fetch Clockify report.", "error")
    } finally {
      setReportLoadingAction(null)
    }
  }

  const handleReuploadReport = async () => {
    if (!isAdmin) {
      toast("Only admins can re-upload sessions.", "error")
      return
    }
    setConfirmDialog({ type: "reupload" })
  }

  const resolveReconcileStatus = useCallback(async (
    displayIds: string[],
    sourceMap?: Record<string, ClockifyReconcileEntry>
  ) => {
    const baseMap = sourceMap || reconcileMapRef.current
    const normalizedIds = Array.from(
      new Set(displayIds.map((id) => normalizeTicketId(id)).filter((id) => id.length > 0))
    )

    if (normalizedIds.length === 0) {
      setTicketLookup({})
      setReconcileMap((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((entryId) => {
          const entry = next[entryId]
          if (!entry.ticketDisplayId) {
            next[entryId] = { ...entry, status: "unlinked" }
          }
        })
        return next
      })
      return { lookup: {}, updatedMap: baseMap }
    }

    const response = await fetch("/api/clockify/reconcile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayIds: normalizedIds }),
    })

    if (!response.ok) {
      return { lookup: {}, updatedMap: baseMap }
    }

    const data = await response.json()
    const lookup: Record<string, ClockifyTicketLookupItem> = {}
    ;(data.tickets || []).forEach((ticket: any) => {
      const displayId = ticket?.displayId ?? ticket?.display_id
      if (displayId) {
        lookup[String(displayId).toUpperCase()] = {
          ...ticket,
          displayId: String(displayId),
        }
      }
    })

    const updatedMap: Record<string, ClockifyReconcileEntry> = { ...baseMap }
    Object.keys(updatedMap).forEach((entryId) => {
      const entry = updatedMap[entryId]
      const displayId = entry.ticketDisplayId
      if (!displayId) {
        updatedMap[entryId] = { ...entry, status: "unlinked", ticketId: undefined }
        return
      }
      updatedMap[entryId] = {
        ...entry,
        status: lookup[displayId] ? "matched" : "not_found",
        ticketId: lookup[displayId]?.id,
      }
    })

    setTicketLookup((prev) => ({ ...prev, ...lookup }))
    setReconcileMap(updatedMap)
    return { lookup, updatedMap }
  }, [])

  const persistReconciliation = useCallback(async (map: Record<string, ClockifyReconcileEntry>) => {
    if (!selectedSession) {
      throw new Error("No selected session")
    }

    const response = await fetch("/api/clockify/sessions", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: selectedSession.id,
        reconciliation: map,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to save reconciliation")
    }

    const data = await response.json()
    if (data?.session) {
      setSelectedSession(data.session)
    }
    queryClient.invalidateQueries({ queryKey: ["clockify-sessions"] })
    return data?.session || null
  }, [queryClient, selectedSession])

  const handleTicketChange = (entryId: string, value: string) => {
    const normalizedValue = normalizeTicketId(value)
    setReconcileMap((prev) => ({
      ...prev,
      [entryId]: {
        ticketDisplayId: normalizedValue,
        status: normalizedValue ? "pending" : "unlinked",
      },
    }))
  }

  const handleTicketBlur = async (entryId: string, value: string) => {
    const normalizedValue = normalizeTicketId(value)
    const nextMap = {
      ...reconcileMap,
      [entryId]: {
        ticketDisplayId: normalizedValue,
        status: normalizedValue ? "pending" : "unlinked",
      },
    }
    const displayIds = Object.values(nextMap)
      .map((entry) => entry.ticketDisplayId)
      .filter((id) => id.length > 0)
    await resolveReconcileStatus(displayIds, nextMap)
  }

  const handleSmartReconcile = async () => {
    if (!reportEntriesRaw.length) return
    setIsReconciling(true)
    const currentMap = reconcileMapRef.current
    const nextMap: Record<string, ClockifyReconcileEntry> = {}
    const displayIds: string[] = []

    reportEntriesRaw.forEach((entry) => {
      const entryId = getEntryId(entry)
      if (!entryId) return

      const existingEntry = currentMap[entryId]
      const existingDisplayId = normalizeTicketId(existingEntry?.ticketDisplayId || "")
      if (existingDisplayId) {
        displayIds.push(existingDisplayId)
        nextMap[entryId] = {
          ticketDisplayId: existingDisplayId,
          status: existingEntry?.status || "pending",
          ticketId: existingEntry?.ticketId,
        }
        return
      }

      const inferredId = extractTicketIdFromEntry(entry)
      const normalizedId = inferredId ? normalizeTicketId(inferredId) : ""
      if (normalizedId) {
        displayIds.push(normalizedId)
      }
      nextMap[entryId] = {
        ticketDisplayId: normalizedId,
        status: normalizedId ? "pending" : "unlinked",
      }
    })

    setReconcileMap(nextMap)
    try {
      await resolveReconcileStatus(displayIds, nextMap)
      toast("Smart reconcile complete.", "success")
    } finally {
      setIsReconciling(false)
    }
  }

  const handleTicketSelect = async (entryId: string, displayId: string) => {
    const normalizedValue = normalizeTicketId(displayId)
    const ticket = ticketLookup[normalizedValue]
    const nextMap = {
      ...reconcileMapRef.current,
      [entryId]: {
        ticketDisplayId: normalizedValue,
        status: normalizedValue ? "pending" : "unlinked",
        ticketId: ticket?.id,
      },
    }
    setReconcileMap(nextMap)
    setTicketSearchTerm(normalizedValue)
    setActiveTicketEntryId(null)
    const displayIds = Object.values(nextMap)
      .map((entry) => entry.ticketDisplayId)
      .filter((id) => id.length > 0)
    const { updatedMap } = await resolveReconcileStatus(displayIds, nextMap)
    return updatedMap || nextMap
  }

  const openCreateTicketDialog = (entryId: string, entry: ClockifyReportEntry) => {
    if (!canCreateTickets) {
      toast("You do not have permission to create tickets.", "error")
      return
    }

    setCreateTicketDialog({
      entryId,
      title: getEntryTitle(entry),
      createdAt: entry?.timeInterval?.start || null,
    })
  }

  const handleClockifyTicketCreated = async (ticket: {
    id: string
    displayId: string | null
    title: string
  }) => {
    if (!createTicketDialog?.entryId) {
      return
    }

    if (!ticket.displayId) {
      toast("Ticket created but display ID is missing. Link it manually.", "error")
      return
    }

    try {
      const updatedMap = await handleTicketSelect(createTicketDialog.entryId, ticket.displayId)
      await persistReconciliation(updatedMap)
      toast("Ticket created and linked.", "success")
    } catch (error) {
      console.error("Automatic ticket link failed:", error)
      toast("Ticket created, but auto-link failed. Please save reconciliation.", "error")
    }
  }

  const handleSaveReconciliation = async () => {
    if (!selectedSession) return
    setIsSavingReconcile(true)

    try {
      const displayIds = Object.values(reconcileMap)
        .map((entry) => entry.ticketDisplayId)
        .filter((value) => value.length > 0)

      const { updatedMap } = await resolveReconcileStatus(displayIds, reconcileMap)
      await persistReconciliation(updatedMap || reconcileMap)
      toast("Reconciliation saved.", "success")
    } catch (error) {
      console.error("Reconciliation save failed:", error)
      toast("Failed to save reconciliation.", "error")
    } finally {
      setIsSavingReconcile(false)
    }
  }

  const performReupload = async () => {
    setConfirmDialog(null)
    setReportLoadingAction("reupload")
    try {
      await createSession.mutateAsync({ startDate, endDate, clearSessions: true })
      toast("Sessions re-uploaded.", "success")
    } catch (error) {
      console.error("Clockify re-upload failed:", error)
      toast("Failed to re-upload sessions.", "error")
    } finally {
      setReportLoadingAction(null)
    }
  }

  const clearSessionParam = () => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    url.searchParams.delete("sessionId")
    window.history.replaceState({}, "", url.toString())
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!canManageSessions) {
      toast("You do not have permission to delete sessions.", "error")
      return
    }
    setConfirmDialog({ type: "delete", sessionId })
  }

  const performDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/clockify/sessions?sessionId=${sessionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete session")
      }

      if (selectedSession?.id === sessionId) {
        setSelectedSession(null)
        clearSessionParam()
      }

      queryClient.invalidateQueries({ queryKey: ["clockify-sessions"] })
      toast("Session deleted.", "success")
    } catch (error) {
      console.error("Delete session failed:", error)
      toast("Failed to delete session.", "error")
    } finally {
      setConfirmDialog(null)
    }
  }

  const reportEntriesRaw = useMemo(() => {
    const reportData = selectedSession?.report_data
    if (!reportData || typeof reportData !== "object") return []
    const entries = Array.isArray((reportData as any).timeentries)
      ? (reportData as any).timeentries
      : Array.isArray((reportData as any).timeEntries)
        ? (reportData as any).timeEntries
        : []
    return entries.filter(matchesCustomField)
  }, [selectedSession])

  useEffect(() => {
    reconcileMapRef.current = reconcileMap
  }, [reconcileMap])

  useEffect(() => {
    if (currentUser?.name) {
      setSelectedUser(currentUser.name)
    }
  }, [currentUser?.name])

  const userOptions = useMemo(() => {
    const names = new Set<string>()
    reportEntriesRaw.forEach((entry) => {
      const name = entry.userName || entry.user?.name
      if (name) names.add(name)
    })
    if (currentUser?.name) {
      names.add(currentUser.name)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [currentUser?.name, reportEntriesRaw])

  const reportEntries = useMemo(() => {
    if (!selectedUser || selectedUser === "all") return reportEntriesRaw
    return reportEntriesRaw.filter((entry) => {
      const name = entry.userName || entry.user?.name || ""
      return name === selectedUser
    })
  }, [reportEntriesRaw, selectedUser])

  const totalDurationHours = useMemo(() => {
    const totalSeconds = reportEntries.reduce((sum: number, entry) => {
      const duration = entry?.timeInterval?.duration
      return typeof duration === "number" && !Number.isNaN(duration)
        ? sum + duration
        : sum
    }, 0)
    return (totalSeconds / 3600).toFixed(2)
  }, [reportEntries])

  useEffect(() => {
    if (!selectedSession) {
      setReconcileMap({})
      setTicketLookup({})
      return
    }

    const nextMap: Record<string, ClockifyReconcileEntry> = {}
    const displayIds = new Set<string>()

    reportEntriesRaw.forEach((entry) => {
      const entryId = getEntryId(entry)
      if (!entryId) return

      const storedMap = selectedSession?.reconciliation?.[entryId]
      const storedDisplayId = storedMap?.ticketDisplayId || entry?.reconcileTicketDisplayId
      const storedStatus = storedMap?.status || entry?.reconcileStatus
      const storedTicketId = storedMap?.ticketId || entry?.reconcileTicketId
      const inferredId = storedDisplayId || extractTicketIdFromEntry(entry)
      const normalizedId = inferredId ? normalizeTicketId(inferredId) : ""

      if (normalizedId) {
        displayIds.add(normalizedId)
      }

      nextMap[entryId] = {
        ticketDisplayId: normalizedId,
        status: storedStatus || (normalizedId ? "pending" : "unlinked"),
        ticketId: storedTicketId,
      }
    })

    setReconcileMap(nextMap)
    resolveReconcileStatus(Array.from(displayIds), nextMap)
  }, [reportEntriesRaw, resolveReconcileStatus, selectedSession])

  useEffect(() => {
    if (!activeTicketEntryId) return
    let isActive = true
    const controller = new AbortController()
    setIsTicketSearchLoading(true)

    const fetchTickets = async () => {
      try {
        const params = new URLSearchParams()
        if (ticketSearchTerm) {
          params.set("q", ticketSearchTerm)
        }
        const response = await fetch(`/api/clockify/tickets?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error("Ticket search failed")
        }
        const data = await response.json()
        if (isActive) {
          setTicketSearchResults(data.tickets || [])
        }
      } catch (_error) {
        if (isActive) {
          setTicketSearchResults([])
        }
      } finally {
        if (isActive) {
          setIsTicketSearchLoading(false)
        }
      }
    }

    const timeout = setTimeout(fetchTickets, 150)
    const abortTimeout = setTimeout(() => controller.abort(), 6000)
    return () => {
      isActive = false
      controller.abort()
      clearTimeout(timeout)
      clearTimeout(abortTimeout)
    }
  }, [activeTicketEntryId, ticketSearchTerm])

  const sessionIdParam = searchParams.get("sessionId")

  useEffect(() => {
    const effectiveSessionId = routeSessionId || sessionIdParam
    if (!effectiveSessionId) {
      setSelectedSession(null)
      return
    }

    const match = sessions.find((session) => session.id === effectiveSessionId) || null
    setSelectedSession(match)
  }, [routeSessionId, sessionIdParam, sessions])

  const isSessionDetailMode = Boolean(routeSessionId || sessionIdParam)

  return (
    <PageLayout>
      <PageHeader
        title="Clockify"
        description="Reconcile Clockify time entries with tickets and manage report sessions."
        actions={
          !isSessionDetailMode && isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={handleReuploadReport}
                disabled={createSession.isPending}
              >
                Re-upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleFetchReport}
                disabled={createSession.isPending}
              >
                {createSession.isPending ? "Fetching..." : "Fetch Report"}
              </Button>
            </div>
          ) : null
        }
      />

      {!isSessionDetailMode ? (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Range</CardTitle>
              <CardDescription>
                Reports always run Monday through Sunday. Default is the last full week.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Selected range</p>
                  <p className="text-lg font-medium">{rangeLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeekOffset((prev) => prev + 1)}
                    aria-label="View older week"
                  >
                    Older
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeekOffset((prev) => Math.max(1, prev - 1))}
                    disabled={weekOffset <= 1}
                    aria-label="View newer week"
                  >
                    Newer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!isSessionDetailMode && canManageSessions ? (
        <ClockifySessionsCard
          isLoading={isLoading}
          sessions={sessions}
          onDeleteSession={handleDeleteSession}
          formatRangeLabel={formatRangeLabel}
        />
      ) : null}

      {isSessionDetailMode && !isLoading && !selectedSession ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Clockify Report Session</CardTitle>
            <Button variant="outline" asChild>
              <Link to="/clockify">Back to sessions</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Session not found.</p>
          </CardContent>
        </Card>
      ) : null}

      {selectedSession && canManageSessions ? (
        <ClockifyReportSessionCard
          selectedSession={selectedSession}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
          userOptions={userOptions}
          reportEntries={reportEntries}
          totalDurationHours={totalDurationHours}
          canManageSessions={canManageSessions}
          isReconciling={isReconciling}
          isSavingReconcile={isSavingReconcile}
          onSmartReconcile={handleSmartReconcile}
          onSaveReconciliation={handleSaveReconciliation}
          nativeSelectClassName={nativeSelectClassName}
          reconcileMap={reconcileMap}
          activeTicketEntryId={activeTicketEntryId}
          setActiveTicketEntryId={setActiveTicketEntryId}
          setTicketSearchTerm={setTicketSearchTerm}
          isTicketSearchLoading={isTicketSearchLoading}
          ticketSearchResults={ticketSearchResults}
          onTicketChange={handleTicketChange}
          onTicketBlur={handleTicketBlur}
          onTicketSelect={(entryId, displayId) => {
            void handleTicketSelect(entryId, displayId)
          }}
          canCreateTickets={canCreateTickets}
          onOpenCreateTicketDialog={openCreateTicketDialog}
          formatRangeLabel={formatRangeLabel}
          getEntryId={getEntryId}
          getEntryTitle={getEntryTitle}
          formatDurationHours={formatDurationHours}
        />
      ) : null}

      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === "delete" ? "Delete session?" : "Re-upload sessions?"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === "delete"
                ? "This will permanently remove the session and its report data."
                : "Re-uploading will remove all previous sessions and store the latest report."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(null)}
              disabled={createSession.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog?.type === "delete" ? "destructive" : "default"}
              disabled={createSession.isPending}
              onClick={() => {
                if (confirmDialog?.type === "delete" && confirmDialog.sessionId) {
                  void performDeleteSession(confirmDialog.sessionId)
                } else if (confirmDialog?.type === "reupload") {
                  void performReupload()
                }
              }}
            >
              {createSession.isPending ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reportLoadingAction} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {reportLoadingAction === "reupload" ? "Re-uploading sessions" : "Fetching report"}
            </DialogTitle>
            <DialogDescription>
              This can take a while for full-week data. Please wait.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <span className="animate-pulse text-xs font-semibold uppercase tracking-wide text-slate-500">
              Working
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <FormDialogShell
        open={!!createTicketDialog}
        onOpenChange={(open) => {
          if (isCreatingTicket) return
          if (!open) setCreateTicketDialog(null)
        }}
        title="Create Ticket"
        description="Ticket created_at will use the Clockify start date for this entry."
        formId="clockify-create-ticket-form"
        submitLabel={isCreatingTicket ? "Creating..." : "Create"}
        submitDisabled={isCreatingTicket}
      >
        {createTicketDialog ? (
          <TicketForm
            key={createTicketDialog.entryId}
            formId="clockify-create-ticket-form"
            hideSubmitButton={true}
            projectOptions={projectOptions}
            initialData={{ title: createTicketDialog.title }}
            createOverrides={{ created_at: createTicketDialog.createdAt }}
            onSubmittingChange={setIsCreatingTicket}
            onCreated={handleClockifyTicketCreated}
            onSuccess={() => {
              setIsCreatingTicket(false)
              setCreateTicketDialog(null)
            }}
          />
        ) : null}
      </FormDialogShell>
    </PageLayout>
  )
}
