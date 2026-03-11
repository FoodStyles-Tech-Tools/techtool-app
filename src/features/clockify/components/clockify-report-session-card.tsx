"use client"

import type { Dispatch, SetStateAction } from "react"
import { Link } from "react-router-dom"
import { Button } from "@client/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card"
import { Input } from "@client/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table"
import type { ClockifyReportSession } from "@client/hooks/use-clockify"
import type {
  ClockifyReportEntry,
  ClockifyReconcileEntry,
  ClockifyTicketLookupItem,
} from "@client/features/clockify/types"
import { InlineLoader } from "@client/components/ui/loading-pill"

type ClockifyReportSessionCardProps = {
  selectedSession: ClockifyReportSession
  selectedUser: string
  setSelectedUser: (value: string) => void
  userOptions: string[]
  reportEntries: ClockifyReportEntry[]
  totalDurationHours: string
  canManageSessions: boolean
  isReconciling: boolean
  isSavingReconcile: boolean
  onSmartReconcile: () => void
  onSaveReconciliation: () => void
  nativeSelectClassName: string
  reconcileMap: Record<string, ClockifyReconcileEntry>
  activeTicketEntryId: string | null
  setActiveTicketEntryId: Dispatch<SetStateAction<string | null>>
  setTicketSearchTerm: (value: string) => void
  isTicketSearchLoading: boolean
  ticketSearchResults: ClockifyTicketLookupItem[]
  onTicketChange: (entryId: string, value: string) => void
  onTicketBlur: (entryId: string, value: string) => void
  onTicketSelect: (entryId: string, displayId: string) => void
  canCreateTickets: boolean
  onOpenCreateTicketDialog: (entryId: string, entry: ClockifyReportEntry) => void
  formatRangeLabel: (startDate: string, endDate: string) => string
  getEntryId: (entry: ClockifyReportEntry) => string
  getEntryTitle: (entry: ClockifyReportEntry) => string
  formatDurationHours: (entry: ClockifyReportEntry) => string
}

export function ClockifyReportSessionCard({
  selectedSession,
  selectedUser,
  setSelectedUser,
  userOptions,
  reportEntries,
  totalDurationHours,
  canManageSessions,
  isReconciling,
  isSavingReconcile,
  onSmartReconcile,
  onSaveReconciliation,
  nativeSelectClassName,
  reconcileMap,
  activeTicketEntryId,
  setActiveTicketEntryId,
  setTicketSearchTerm,
  isTicketSearchLoading,
  ticketSearchResults,
  onTicketChange,
  onTicketBlur,
  onTicketSelect,
  canCreateTickets,
  onOpenCreateTicketDialog,
  formatRangeLabel,
  getEntryId,
  getEntryTitle,
  formatDurationHours,
}: ClockifyReportSessionCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Clockify Report Session</CardTitle>
          <CardDescription>
            {formatRangeLabel(selectedSession.start_date, selectedSession.end_date)}
          </CardDescription>
        </div>
        <Button variant="outline" asChild>
          <Link to="/clockify">Back to sessions</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-slate-500">Status</p>
              <p className="font-medium capitalize">{selectedSession.status}</p>
            </div>
            {selectedSession.error_message ? (
              <div>
                <p className="text-slate-500">Error</p>
                <p className="font-medium text-red-600">{selectedSession.error_message}</p>
              </div>
            ) : null}
          </div>

          {selectedSession.report_data ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Filter by user</p>
                  <p className="text-xs text-slate-500">Defaulted to your account.</p>
                </div>
                <select
                  value={selectedUser || "all"}
                  onChange={(event) => setSelectedUser(event.target.value)}
                  className={`${nativeSelectClassName} sm:w-56`}
                >
                  <option value="all">All users</option>
                  {userOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                  <p className="text-sm text-slate-500">{reportEntries.length} time entries</p>
                  <p className="text-sm text-slate-500">Total duration: {totalDurationHours} hrs</p>
                </div>
                {canManageSessions ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={onSmartReconcile} disabled={isReconciling}>
                      {isReconciling ? "Reconciling..." : "Smart reconcile"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={onSaveReconciliation} disabled={isSavingReconcile}>
                      {isSavingReconcile ? "Saving..." : "Save reconciliation"}
                    </Button>
                  </div>
                ) : null}
              </div>
              {reportEntries.length > 0 ? (
                <div className="max-h-[60vh] overflow-y-auto rounded-md border">
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
                      {reportEntries.map((entry, index) => {
                        const entryId = getEntryId(entry)
                        const matchStatus = entryId ? (reconcileMap[entryId]?.status || "unlinked") : "unlinked"
                        return (
                          <TableRow key={entryId || index}>
                            <TableCell className="py-2 text-sm">{getEntryTitle(entry)}</TableCell>
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
                                      setTicketSearchTerm(reconcileMap[entryId]?.ticketDisplayId || "")
                                    }}
                                    onChange={(event) => {
                                      onTicketChange(entryId, event.target.value)
                                      setTicketSearchTerm(event.target.value)
                                      setActiveTicketEntryId(entryId)
                                    }}
                                    onBlur={(event) => {
                                      onTicketBlur(entryId, event.target.value)
                                      setTimeout(() => {
                                        setActiveTicketEntryId((current) => (current === entryId ? null : current))
                                      }, 150)
                                    }}
                                    placeholder="HRB-###"
                                    className="h-8 w-28"
                                  />
                                  {activeTicketEntryId === entryId ? (
                                    <div className="absolute z-20 mt-1 max-h-48 w-72 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
                                      {isTicketSearchLoading ? (
                                        <div className="px-3 py-2"><InlineLoader label="Loading tickets..." className="justify-start text-xs" /></div>
                                      ) : ticketSearchResults.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-slate-500">No tickets found.</div>
                                      ) : (
                                        ticketSearchResults.map((ticket) => (
                                          <button
                                            key={ticket.id}
                                            type="button"
                                            className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => onTicketSelect(entryId, ticket.displayId)}
                                          >
                                            <span className="font-medium">{ticket.displayId}</span>
                                            {ticket.title ? ` - ${ticket.title}` : ""}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  ) : null}
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
                                    onClick={() => onOpenCreateTicketDialog(entryId, entry)}
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
                                          : "text-slate-500"
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
                            <TableCell className="py-2 text-right text-sm">
                              {formatDurationHours(entry)}
                            </TableCell>
                            <TableCell className="py-2 text-sm">
                              {entry.projectName || entry.project?.name || "-"}
                            </TableCell>
                            <TableCell className="py-2 text-sm">
                              {entry.timeInterval?.start ? new Date(entry.timeInterval.start).toLocaleString() : "-"}
                            </TableCell>
                            <TableCell className="py-2 text-sm">
                              {entry.timeInterval?.end ? new Date(entry.timeInterval.end).toLocaleString() : "-"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-md border p-4">
                  <p className="text-sm text-slate-500">No time entries found.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border p-4">
              <p className="text-sm text-slate-500">No report data saved for this session.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
