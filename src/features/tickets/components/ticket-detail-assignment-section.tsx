"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@client/components/ui/button"
import { Input } from "@client/components/ui/input"
import { TicketTypeSelect } from "@client/components/ticket-type-select"
import type { Ticket, User } from "@shared/types"
import type { ParentTicketOption } from "@client/features/tickets/components/ticket-detail-sidebar-types"

const UNASSIGNED_VALUE = "unassigned"
const NO_PARENT_TICKET_VALUE = "no_parent_ticket"
const nativeSelectClassName =
  "h-8 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
const fieldLabelClassName =
  "w-[6.5rem] flex-shrink-0 pt-2 text-xs font-medium uppercase tracking-wide text-slate-500"

type TicketDetailAssignmentSectionProps = {
  ticket: Ticket
  canEditTickets: boolean
  isAssignmentLocked: boolean
  isSqaEditLocked: boolean
  updatingFields: Record<string, boolean>
  currentUser: User | null
  users: User[]
  assigneeEligibleUsers: User[]
  sqaEligibleUsers: User[]
  parentTicketOptions: ParentTicketOption[]
  selectedParentTicketId: string | null
  selectedParentTicketOption: ParentTicketOption | null
  parentNavigationSlug: string | null
  onAssigneeChange: (value: string | null) => void | Promise<void>
  onRequestedByChange: (value: string) => void | Promise<void>
  onSqaAssigneeChange: (value: string | null) => void | Promise<void>
  onTypeChange: (value: string) => void | Promise<void>
  onParentTicketChange: (value: string) => void | Promise<void>
}

export function TicketDetailAssignmentSection({
  ticket,
  canEditTickets,
  isAssignmentLocked,
  isSqaEditLocked,
  updatingFields,
  currentUser,
  users,
  assigneeEligibleUsers,
  sqaEligibleUsers,
  parentTicketOptions,
  selectedParentTicketId,
  selectedParentTicketOption,
  parentNavigationSlug,
  onAssigneeChange,
  onRequestedByChange,
  onSqaAssigneeChange,
  onTypeChange,
  onParentTicketChange,
}: TicketDetailAssignmentSectionProps) {
  const [isParentPickerOpen, setIsParentPickerOpen] = useState(false)
  const [parentSearch, setParentSearch] = useState("")
  const parentPickerRef = useRef<HTMLDivElement | null>(null)

  const parentFilteredOptions = useMemo(() => {
    if (!parentSearch.trim()) return parentTicketOptions
    const term = parentSearch.toLowerCase()
    return parentTicketOptions.filter((candidate) => {
      const idPart = String(candidate.displayId || candidate.id).toLowerCase()
      const titlePart = (candidate.title || "").toLowerCase()
      return idPart.includes(term) || titlePart.includes(term)
    })
  }, [parentSearch, parentTicketOptions])

  useEffect(() => {
    if (!isParentPickerOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!parentPickerRef.current?.contains(event.target as Node)) {
        setIsParentPickerOpen(false)
        setParentSearch("")
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsParentPickerOpen(false)
        setParentSearch("")
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isParentPickerOpen])

  return (
    <>
      <div className="flex items-start gap-3">
        <label className={fieldLabelClassName}>Assignee</label>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <select
                value={ticket.assignee?.id || UNASSIGNED_VALUE}
                onChange={(event) =>
                  void onAssigneeChange(
                    event.target.value === UNASSIGNED_VALUE ? null : event.target.value
                  )
                }
                disabled={!canEditTickets || updatingFields["assigneeId"]}
                className={nativeSelectClassName}
              >
                <option value={UNASSIGNED_VALUE}>Unassigned</option>
                {assigneeEligibleUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>
            {!ticket.assignee && currentUser ? (
              <button
                type="button"
                className="whitespace-nowrap text-xs text-slate-700 hover:underline disabled:opacity-50"
                onClick={() => void onAssigneeChange(currentUser.id)}
                disabled={updatingFields["assigneeId"] || !canEditTickets}
              >
                Assign to me
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className={fieldLabelClassName}>Reporter</label>
        <div className="min-w-0 flex-1">
          <select
            value={ticket.requestedBy?.id || ""}
            onChange={(event) => void onRequestedByChange(event.target.value)}
            disabled={!canEditTickets || isAssignmentLocked || updatingFields["requestedById"]}
            className={nativeSelectClassName}
          >
            <option value="">Select user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className={fieldLabelClassName}>SQA</label>
        <div className="min-w-0 flex-1">
          <select
            value={ticket.sqaAssignee?.id || UNASSIGNED_VALUE}
            onChange={(event) =>
              void onSqaAssigneeChange(
                event.target.value === UNASSIGNED_VALUE ? null : event.target.value
              )
            }
            disabled={
              !canEditTickets ||
              updatingFields["sqaAssigneeId"] ||
              (isAssignmentLocked && !isSqaEditLocked)
            }
            className={nativeSelectClassName}
          >
            <option value={UNASSIGNED_VALUE}>Unassigned</option>
            {sqaEligibleUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className={fieldLabelClassName}>Type</label>
        <div className="min-w-0 flex-1">
          <TicketTypeSelect
            value={ticket.type || "task"}
            onValueChange={(value) => void onTypeChange(value)}
            disabled={!canEditTickets || isAssignmentLocked || updatingFields["type"]}
            triggerClassName="h-8 w-full"
          />
        </div>
      </div>

      {ticket.type === "subtask" ? (
        <div className="flex items-start gap-3">
          <label className={fieldLabelClassName}>Parent</label>
          <div className="min-w-0 flex-1">
            <div ref={parentPickerRef} className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canEditTickets || isAssignmentLocked || updatingFields["parentTicketId"]}
                className="h-8 w-full justify-between overflow-hidden"
                onClick={() => {
                  setIsParentPickerOpen((current) => {
                    const next = !current
                    if (!next) {
                      setParentSearch("")
                    }
                    return next
                  })
                }}
              >
                <span className="truncate text-xs text-slate-900">
                  {selectedParentTicketOption
                    ? `${(selectedParentTicketOption.displayId || selectedParentTicketOption.id.slice(0, 8)).toUpperCase()} • ${selectedParentTicketOption.title}`
                    : "No parent ticket"}
                </span>
              </Button>

              {isParentPickerOpen ? (
                <div className="absolute left-0 top-full z-40 mt-2 w-80 rounded-md border border-slate-200 bg-white p-3 shadow-md">
                  <Input
                    placeholder="Search parent ticket..."
                    value={parentSearch}
                    onChange={(event) => setParentSearch(event.target.value)}
                    className="h-8"
                    autoFocus
                  />
                  <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                    <button
                      type="button"
                      className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        void onParentTicketChange(NO_PARENT_TICKET_VALUE)
                        setIsParentPickerOpen(false)
                        setParentSearch("")
                      }}
                    >
                      <span className="text-xs">No parent ticket</span>
                    </button>
                    {parentFilteredOptions.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-slate-500">No tickets found</p>
                    ) : (
                      parentFilteredOptions.map((candidate) => {
                        const isSelected = candidate.id === selectedParentTicketId
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            className={[
                              "flex w-full items-start rounded-md px-2 py-1.5 text-left text-xs hover:bg-slate-50",
                              isSelected ? "bg-slate-100" : "",
                            ].join(" ")}
                            onClick={() => {
                              void onParentTicketChange(candidate.id)
                              setIsParentPickerOpen(false)
                              setParentSearch("")
                            }}
                          >
                            <span className="truncate">
                              {(candidate.displayId || candidate.id.slice(0, 8)).toUpperCase()} • {candidate.title}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            {parentNavigationSlug ? (
              <a
                href={`/tickets/${parentNavigationSlug}`}
                className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 hover:underline"
              >
                Open parent ticket
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
