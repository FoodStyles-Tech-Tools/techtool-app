"use client"

import type { Dispatch, SetStateAction } from "react"
import { Badge } from "@client/components/ui/badge"
import { Input } from "@client/components/ui/input"
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
import type {
  ClockifyReportEntry,
  ClockifyReconcileEntry,
  ClockifyTicketLookupItem,
} from "@client/features/clockify/types"

type ClockifyReportSessionCardProps = {
  selectedSession: ClockifyReportSession
  selectedUser: string
  setSelectedUser: (value: string) => void
  userOptions: string[]
  selectedProject: string
  setSelectedProject: (value: string) => void
  sessionProjectOptions: string[]
  selectedTask: string
  setSelectedTask: (value: string) => void
  sessionTaskOptions: string[]
  reportEntries: ClockifyReportEntry[]
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
  getEntryId: (entry: ClockifyReportEntry) => string
  getEntryTitle: (entry: ClockifyReportEntry) => string
  formatDurationHours: (entry: ClockifyReportEntry) => string
}

export function ClockifyReportSessionCard({
  selectedSession,
  selectedUser,
  setSelectedUser,
  userOptions,
  selectedProject,
  setSelectedProject,
  sessionProjectOptions,
  selectedTask,
  setSelectedTask,
  sessionTaskOptions,
  reportEntries,
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
  getEntryId,
  getEntryTitle,
  formatDurationHours,
}: ClockifyReportSessionCardProps) {
  if (!selectedSession.report_data) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">No report data saved for this session.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <select
            id="clockify-filter-user"
            value={selectedUser || "all"}
            onChange={(e) => setSelectedUser(e.target.value)}
            className={nativeSelectClassName}
          >
            <option value="all">All</option>
            {userOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        <select
            id="clockify-filter-project"
            value={selectedProject || ""}
            onChange={(e) => setSelectedProject(e.target.value)}
            className={nativeSelectClassName}
          >
            <option value="">All Project</option>
            {sessionProjectOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        <select
            id="clockify-filter-task"
            value={selectedTask || ""}
            onChange={(e) => setSelectedTask(e.target.value)}
            className={nativeSelectClassName}
          >
            <option value="">All Task</option>
            {sessionTaskOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
      </div>

      {reportEntries.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">No time entries match the filters.</p>
        </div>
      ) : (
        <EntityTableShell>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 py-2">User</TableHead>
                  <TableHead className="h-9 py-2">Project</TableHead>
                  <TableHead className="h-9 py-2">Task</TableHead>
                  <TableHead className="h-9 py-2">Description</TableHead>
                  <TableHead className="h-9 py-2 text-right">Duration</TableHead>
                  <TableHead className="h-9 py-2">Ticket ID</TableHead>
                  <TableHead className="h-9 py-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportEntries.map((entry, index) => {
                  const entryId = getEntryId(entry)
                  const matchStatus = entryId ? (reconcileMap[entryId]?.status || "unlinked") : "unlinked"
                  return (
                    <TableRow key={entryId || index}>
                      <TableCell className="py-2 text-sm">
                        {entry.userName || entry.user?.name || "-"}
                      </TableCell>
                      <TableCell className="py-2 text-sm">
                        {entry.projectName || entry.project?.name || "-"}
                      </TableCell>
                      <TableCell className="py-2 text-sm">
                        {entry.taskName || entry.task?.name || "-"}
                      </TableCell>
                      <TableCell className="py-2 text-sm">{getEntryTitle(entry)}</TableCell>
                      <TableCell className="py-2 text-right text-sm">
                        {formatDurationHours(entry)}
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
                                {isTicketSearchLoading ? null : ticketSearchResults.length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-slate-500">No tickets found.</div>
                                ) : (
                                  ticketSearchResults.map((ticket) => (
                                    <button
                                      key={ticket.id}
                                      type="button"
                                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => onTicketSelect(entryId, ticket.displayId)}
                                    >
                                      <span className="font-normal">{ticket.displayId}</span>
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
                      <TableCell className="py-2 text-sm">
                        {entryId ? (
                          matchStatus === "unlinked" ? (
                            <button
                              type="button"
                              className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => onOpenCreateTicketDialog(entryId, entry)}
                              disabled={!canCreateTickets}
                            >
                              Create
                            </button>
                          ) : matchStatus === "matched" ? (
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                              Matched
                            </Badge>
                          ) : matchStatus === "not_found" ? (
                            <Badge variant="destructive">Not found</Badge>
                          ) : (
                            <Badge variant="secondary">{matchStatus}</Badge>
                          )
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </EntityTableShell>
      )}
    </div>
  )
}
