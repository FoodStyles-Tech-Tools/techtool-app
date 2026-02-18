"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TicketForm } from "@/components/forms/ticket-form"
import { toast } from "@/components/ui/toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Eye, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"
import { useProjects } from "@/hooks/use-projects"
import {
  ClockifyReportSession,
  useClockifySessions,
  useClockifySettings,
  useCreateClockifySession,
  useUpdateClockifySettings,
} from "@/hooks/use-clockify"

const formatDate = (date: Date) => date.toISOString().slice(0, 10)

const getWeekRange = (weeksBack: number) => {
  const now = new Date()
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dayOfWeek = utcToday.getUTCDay()
  const daysSinceMonday = (dayOfWeek + 6) % 7

  const mondayThisWeek = new Date(utcToday)
  mondayThisWeek.setUTCDate(utcToday.getUTCDate() - daysSinceMonday)

  const startDate = new Date(mondayThisWeek)
  startDate.setUTCDate(mondayThisWeek.getUTCDate() - weeksBack * 7)

  const endDate = new Date(startDate)
  endDate.setUTCDate(startDate.getUTCDate() + 6)

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  }
}

const formatRangeLabel = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  return `${start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} - ${end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`
}

const scheduleOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
]

const CLOCKIFY_CUSTOM_FIELD_ID = "64f739d670d77d39061e8b05"
const CLOCKIFY_CUSTOM_FIELD_VALUE = "TechTool"

const getCustomFieldValue = (entry: any) => {
  const customFields = entry?.customFields || entry?.customField || []
  if (!Array.isArray(customFields)) return ""
  const match = customFields.find((field: any) => {
    const fieldId = field?.customFieldId || field?.id
    return fieldId === CLOCKIFY_CUSTOM_FIELD_ID
  })
  return match?.value || match?.text || match?.name || ""
}

const matchesCustomField = (entry: any) => {
  return (
    String(getCustomFieldValue(entry)).trim().toLowerCase() ===
    CLOCKIFY_CUSTOM_FIELD_VALUE.toLowerCase()
  )
}

const formatDurationHours = (entry: any) => {
  const durationSeconds = entry?.timeInterval?.duration
  if (typeof durationSeconds !== "number" || Number.isNaN(durationSeconds)) return "-"
  return (durationSeconds / 3600).toFixed(2)
}

const extractTicketId = (value: string | null | undefined) => {
  if (!value) return ""
  const match = value.match(/hrb-\d+/i)
  return match ? match[0].toUpperCase() : ""
}

const normalizeTicketId = (value: string) => value.trim().toUpperCase()

const extractTicketIdFromEntry = (entry: any) => {
  const candidates = [
    entry?.description,
    entry?.taskName,
    entry?.task?.name,
    entry?.projectName,
    entry?.project?.name,
  ]
  const combined = candidates.filter(Boolean).join(" ")
  return extractTicketId(combined)
}

const getEntryId = (entry: any) => {
  return entry?.id || entry?._id || entry?.timeEntryId || ""
}

const getEntryTitle = (entry: any) => {
  const value = entry?.description || entry?.taskName || entry?.task?.name || "Untitled"
  return String(value || "Untitled").trim() || "Untitled"
}

export default function ClockifyClient() {
  const queryClient = useQueryClient()
  const { flags, user: currentUser } = usePermissions()
  const isAdmin = currentUser?.role?.toLowerCase() === "admin"
  const canManageClockify = flags?.canManageClockify ?? false
  const canCreateTickets = flags?.canCreateTickets ?? false
  const canManageSettings = canManageClockify
  const canManageSessions = canManageClockify
  const searchParams = useSearchParams()

  const [weekOffset, setWeekOffset] = useState(1)
  const [selectedSession, setSelectedSession] = useState<ClockifyReportSession | null>(null)

  const { startDate, endDate } = useMemo(() => getWeekRange(weekOffset), [weekOffset])
  const rangeLabel = useMemo(
    () => formatRangeLabel(startDate, endDate),
    [startDate, endDate]
  )

  const { data: sessions = [], isLoading } = useClockifySessions()
  const createSession = useCreateClockifySession()
  const [createTicketDialog, setCreateTicketDialog] = useState<{
    entryId: string
    title: string
    createdAt: string | null
  } | null>(null)
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)
  const { data: projectOptions = [] } = useProjects({
    enabled: !!createTicketDialog,
    realtime: false,
  })

  const { data: settings, isLoading: settingsLoading } = useClockifySettings()
  const updateSettings = useUpdateClockifySettings()

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
    const nextMap: Record<string, { ticketDisplayId: string; status: string; ticketId?: string }> = {}
    const displayIds: string[] = []

    reportEntriesRaw.forEach((entry: any) => {
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

  const persistReconciliation = useCallback(async (
    map: Record<string, { ticketDisplayId: string; status: string; ticketId?: string }>
  ) => {
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

  const openCreateTicketDialog = (entryId: string, entry: any) => {
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
    display_id: string | null
    title: string
  }) => {
    if (!createTicketDialog?.entryId) {
      return
    }

    if (!ticket.display_id) {
      toast("Ticket created but display ID is missing. Link it manually.", "error")
      return
    }

    try {
      const updatedMap = await handleTicketSelect(createTicketDialog.entryId, ticket.display_id)
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

  const handleScheduleChange = async (value: string) => {
    try {
      await updateSettings.mutateAsync({ schedule: value })
      toast("Schedule updated.", "success")
    } catch (error) {
      console.error("Clockify schedule update failed:", error)
      toast("Failed to update schedule.", "error")
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

  const [selectedUser, setSelectedUser] = useState<string>("")
  const [reconcileMap, setReconcileMap] = useState<
    Record<string, { ticketDisplayId: string; status: string; ticketId?: string }>
  >({})
  const reconcileMapRef = useRef(reconcileMap)
  const [isSavingReconcile, setIsSavingReconcile] = useState(false)
  const [isReconciling, setIsReconciling] = useState(false)
  const [ticketLookup, setTicketLookup] = useState<
    Record<string, { id: string; display_id: string; title?: string }>
  >({})
  const [activeTicketEntryId, setActiveTicketEntryId] = useState<string | null>(null)
  const [ticketSearchTerm, setTicketSearchTerm] = useState<string>("")
  const [ticketSearchResults, setTicketSearchResults] = useState<
    Array<{ id: string; display_id: string; title?: string }>
  >([])
  const [isTicketSearchLoading, setIsTicketSearchLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "delete" | "reupload"
    sessionId?: string
  } | null>(null)
  const [reportLoadingAction, setReportLoadingAction] = useState<"fetch" | "reupload" | null>(null)

  useEffect(() => {
    reconcileMapRef.current = reconcileMap
  }, [reconcileMap])

  const resolveReconcileStatus = useCallback(async (
    displayIds: string[],
    sourceMap?: Record<string, { ticketDisplayId: string; status: string; ticketId?: string }>
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
    const lookup: Record<string, { id: string; display_id: string; title?: string }> = {}
    ;(data.tickets || []).forEach((ticket: any) => {
      if (ticket?.display_id) {
        lookup[String(ticket.display_id).toUpperCase()] = ticket
      }
    })

    const updatedMap: Record<
      string,
      { ticketDisplayId: string; status: string; ticketId?: string }
    > = {
      ...baseMap,
    }
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

  useEffect(() => {
    if (currentUser?.name) {
      setSelectedUser(currentUser.name)
    }
  }, [currentUser?.name])

  const userOptions = useMemo(() => {
    const names = new Set<string>()
    reportEntriesRaw.forEach((entry: any) => {
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
    return reportEntriesRaw.filter((entry: any) => {
      const name = entry.userName || entry.user?.name || ""
      return name === selectedUser
    })
  }, [reportEntriesRaw, selectedUser])

  const totalDurationHours = useMemo(() => {
    const totalSeconds = reportEntries.reduce((sum: number, entry: any) => {
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

    const nextMap: Record<string, { ticketDisplayId: string; status: string; ticketId?: string }> = {}
    const displayIds = new Set<string>()

    reportEntriesRaw.forEach((entry: any) => {
      const entryId = getEntryId(entry)
      if (!entryId) return

      const storedMap = selectedSession?.reconciliation?.[entryId]
      const storedDisplayId =
        storedMap?.ticketDisplayId || entry?.reconcileTicketDisplayId
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
      } catch (error) {
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
    if (!sessionIdParam) {
      setSelectedSession(null)
      return
    }

    const match = sessions.find((session) => session.id === sessionIdParam) || null
    setSelectedSession(match)
  }, [sessionIdParam, sessions])

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex justify-end border-b pb-2">
          <div className="flex flex-wrap items-center gap-0.5">
            <button
              type="button"
              onClick={handleReuploadReport}
              disabled={createSession.isPending}
              className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Re-upload
            </button>
            <button
              type="button"
              onClick={handleFetchReport}
              disabled={createSession.isPending}
              className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {createSession.isPending ? "Fetching..." : "Fetch Report"}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
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
                <p className="text-sm text-muted-foreground">Selected range</p>
                <p className="text-lg font-medium">{rangeLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  aria-label="View older week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWeekOffset((prev) => Math.max(1, prev - 1))}
                  disabled={weekOffset <= 1}
                  aria-label="View newer week"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {canManageSettings && (
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>Select how often the report should run.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings?.schedule || "weekly"}
                onValueChange={handleScheduleChange}
                disabled={settingsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  {scheduleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}
      </div>

      {canManageSessions && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>Every time a report is fetched, a session is saved here.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading sessions...</p>
            ) : sessions.length === 0 ? (
              <div className="rounded-lg border p-6 text-center">
                <p className="text-sm text-muted-foreground">No report sessions yet.</p>
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
                            <Button size="icon" variant="ghost" asChild>
                              <Link
                                href={`/clockify?sessionId=${session.id}`}
                                aria-label="View report session"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteSession(session.id)}
                              aria-label="Delete report session"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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
      )}

      {selectedSession && canManageSessions && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Clockify Report Session</CardTitle>
              <CardDescription>
                {formatRangeLabel(selectedSession.start_date, selectedSession.end_date)}
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/clockify">Back to sessions</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{selectedSession.status}</p>
                </div>
                {selectedSession.error_message && (
                  <div>
                    <p className="text-muted-foreground">Error</p>
                    <p className="font-medium text-destructive">
                      {selectedSession.error_message}
                    </p>
                  </div>
                )}
              </div>

              {selectedSession.report_data ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Filter by user</p>
                      <p className="text-xs text-muted-foreground">
                        Defaulted to your account.
                      </p>
                    </div>
                    <Select
                      value={selectedUser || "all"}
                      onValueChange={setSelectedUser}
                    >
                      <SelectTrigger className="sm:w-56">
                        <SelectValue placeholder="All users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All users</SelectItem>
                        {userOptions.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                      <p className="text-sm text-muted-foreground">
                        {reportEntries.length} time entries
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total duration: {totalDurationHours} hrs
                      </p>
                    </div>
                    {canManageSessions && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSmartReconcile}
                          disabled={isReconciling}
                        >
                          {isReconciling ? "Reconciling..." : "Smart reconcile"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveReconciliation}
                          disabled={isSavingReconcile}
                        >
                          {isSavingReconcile ? "Saving..." : "Save reconciliation"}
                        </Button>
                      </div>
                    )}
                  </div>
                  {reportEntries.length > 0 ? (
                    <div className="rounded-md border max-h-[60vh] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="h-9 py-2 text-xs">Description</TableHead>
                            <TableHead className="h-9 py-2 text-xs">Task</TableHead>
                            <TableHead className="h-9 py-2 text-xs">Ticket ID</TableHead>
                            <TableHead className="h-9 py-2 text-xs">Match</TableHead>
                            <TableHead className="h-9 py-2 text-xs">User</TableHead>
                            <TableHead className="h-9 py-2 text-xs text-right">Duration (hrs)</TableHead>
                            <TableHead className="h-9 py-2 text-xs">Project</TableHead>
                            <TableHead className="h-9 py-2 text-xs">Start</TableHead>
                            <TableHead className="h-9 py-2 text-xs">End</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportEntries.map((entry: any, index: number) => {
                            const entryId = getEntryId(entry)
                            const matchStatus = entryId
                              ? (reconcileMap[entryId]?.status || "unlinked")
                              : "unlinked"
                            return (
                            <TableRow key={entryId || index}>
                              <TableCell className="py-2 text-sm">
                                {getEntryTitle(entry)}
                              </TableCell>
                              <TableCell className="py-2 text-sm">
                                {entry.taskName || entry.task?.name || "-"}
                              </TableCell>
                              <TableCell className="py-2 text-sm">
                                {entryId ? (
                                  <div className="relative">
                                    <Input
                                      value={reconcileMap[entryId]?.ticketDisplayId || ""}
                                      onFocus={() => {
                                        setActiveTicketEntryId(entryId)
                                        setTicketSearchTerm(
                                          reconcileMap[entryId]?.ticketDisplayId || ""
                                        )
                                      }}
                                      onChange={(event) => {
                                        handleTicketChange(entryId, event.target.value)
                                        setTicketSearchTerm(event.target.value)
                                        setActiveTicketEntryId(entryId)
                                      }}
                                      onBlur={(event) => {
                                        handleTicketBlur(entryId, event.target.value)
                                        setTimeout(() => {
                                          setActiveTicketEntryId((current) =>
                                            current === entryId ? null : current
                                          )
                                        }, 150)
                                      }}
                                      placeholder="HRB-###"
                                      className="h-8 w-28"
                                    />
                                    {activeTicketEntryId === entryId && (
                                      <div className="absolute z-20 mt-1 max-h-48 w-72 overflow-y-auto rounded-md border bg-background shadow-sm">
                                        {isTicketSearchLoading ? (
                                          <div className="px-3 py-2 text-xs text-muted-foreground">
                                            Loading tickets...
                                          </div>
                                        ) : ticketSearchResults.length === 0 ? (
                                          <div className="px-3 py-2 text-xs text-muted-foreground">
                                            No tickets found.
                                          </div>
                                        ) : (
                                          ticketSearchResults.map((ticket) => (
                                            <button
                                              key={ticket.id}
                                              type="button"
                                              className="block w-full px-3 py-2 text-left text-xs hover:bg-accent"
                                              onMouseDown={(event) => event.preventDefault()}
                                              onClick={() =>
                                                handleTicketSelect(entryId, ticket.display_id)
                                              }
                                            >
                                              <span className="font-medium">
                                                {ticket.display_id}
                                              </span>
                                              {ticket.title ? ` - ${ticket.title}` : ""}
                                            </button>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="py-2 text-xs">
                                {entryId ? (
                                  matchStatus === "unlinked" ? (
                                    <button
                                      type="button"
                                      className="text-purple-600 underline underline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
                                      onClick={() => openCreateTicketDialog(entryId, entry)}
                                      disabled={!canCreateTickets}
                                    >
                                      create
                                    </button>
                                  ) : (
                                    <span
                                      className={
                                        matchStatus === "matched"
                                          ? "text-emerald-600"
                                          : matchStatus === "not_found"
                                            ? "text-red-600"
                                            : "text-muted-foreground"
                                      }
                                    >
                                      {matchStatus}
                                    </span>
                                  )
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="py-2 text-sm">
                                {entry.userName || entry.user?.name || "-"}
                              </TableCell>
                              <TableCell className="py-2 text-sm text-right">
                                {formatDurationHours(entry)}
                              </TableCell>
                              <TableCell className="py-2 text-sm">
                                {entry.projectName || entry.project?.name || "-"}
                              </TableCell>
                              <TableCell className="py-2 text-sm">
                                {entry.timeInterval?.start
                                  ? new Date(entry.timeInterval.start).toLocaleString()
                                  : "-"}
                              </TableCell>
                              <TableCell className="py-2 text-sm">
                                {entry.timeInterval?.end
                                  ? new Date(entry.timeInterval.end).toLocaleString()
                                  : "-"}
                              </TableCell>
                            </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="rounded-md border p-4">
                      <p className="text-sm text-muted-foreground">No time entries found.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">
                    No report data saved for this session.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === "delete"
                ? "Delete session?"
                : "Re-upload sessions?"}
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
                  performDeleteSession(confirmDialog.sessionId)
                } else if (confirmDialog?.type === "reupload") {
                  performReupload()
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
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!createTicketDialog}
        onOpenChange={(open) => {
          if (isCreatingTicket) return
          if (!open) setCreateTicketDialog(null)
        }}
      >
        <DialogContent showCloseButton={false} className="flex h-[90vh] max-w-2xl flex-col overflow-hidden gap-0 p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Create Ticket</DialogTitle>
            <DialogDescription>
              Ticket created_at will use the Clockify Start Date for this entry.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {createTicketDialog && (
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
            )}
          </div>
          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateTicketDialog(null)}
              disabled={isCreatingTicket}
            >
              Cancel
            </Button>
            <Button type="submit" form="clockify-create-ticket-form" disabled={isCreatingTicket}>
              {isCreatingTicket ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
