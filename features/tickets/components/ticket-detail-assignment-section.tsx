"use client"

import { useMemo, useState } from "react"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TicketTypeSelect } from "@/components/ticket-type-select"
import { UserSelectItem, UserSelectValue } from "@/components/user-select-item"
import type { Ticket, User } from "@/lib/types"
import type { ParentTicketOption } from "@/features/tickets/components/ticket-detail-sidebar-types"

const UNASSIGNED_VALUE = "unassigned"
const NO_PARENT_TICKET_VALUE = "no_parent_ticket"

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
  const [isParentPopoverOpen, setIsParentPopoverOpen] = useState(false)
  const [parentSearch, setParentSearch] = useState("")

  const parentFilteredOptions = useMemo(() => {
    if (!parentSearch.trim()) return parentTicketOptions
    const term = parentSearch.toLowerCase()
    return parentTicketOptions.filter((candidate) => {
      const idPart = String(candidate.display_id || candidate.id).toLowerCase()
      const titlePart = (candidate.title || "").toLowerCase()
      return idPart.includes(term) || titlePart.includes(term)
    })
  }, [parentSearch, parentTicketOptions])

  return (
    <>
      <div className="flex items-start gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Assignee</label>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <Select
                value={ticket.assignee?.id || UNASSIGNED_VALUE}
                onValueChange={(value) => void onAssigneeChange(value === UNASSIGNED_VALUE ? null : value)}
                disabled={!canEditTickets || updatingFields["assignee_id"]}
              >
                <SelectTrigger className="h-8 w-full relative overflow-hidden">
                  {ticket.assignee?.id ? (
                    <div className="absolute left-3 right-10 top-0 bottom-0 flex items-center overflow-hidden">
                      <UserSelectValue
                        users={assigneeEligibleUsers}
                        value={ticket.assignee?.id || null}
                        placeholder="Unassigned"
                        unassignedValue={UNASSIGNED_VALUE}
                        unassignedLabel="Unassigned"
                      />
                    </div>
                  ) : (
                    <SelectValue placeholder="Unassigned" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                  {assigneeEligibleUsers.map((user) => (
                    <UserSelectItem key={user.id} user={user} value={user.id} />
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!ticket.assignee && currentUser ? (
              <button
                type="button"
                className="text-[11px] text-blue-600 hover:underline whitespace-nowrap disabled:opacity-50"
                onClick={() => void onAssigneeChange(currentUser.id)}
                disabled={updatingFields["assignee_id"] || !canEditTickets}
              >
                Assign to me
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Reporter</label>
        <div className="flex-1 min-w-0">
          <Select
            value={ticket.requested_by?.id ?? undefined}
            onValueChange={(value) => void onRequestedByChange(value)}
            disabled={!canEditTickets || isAssignmentLocked || updatingFields["requested_by_id"]}
          >
            <SelectTrigger className="h-8 w-full relative overflow-hidden">
              {ticket.requested_by?.id ? (
                <div className="absolute left-3 right-10 top-0 bottom-0 flex items-center overflow-hidden">
                  <UserSelectValue
                    users={users}
                    value={ticket.requested_by?.id ?? undefined}
                    placeholder="Select user"
                  />
                </div>
              ) : (
                <SelectValue placeholder="Select user" />
              )}
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <UserSelectItem key={user.id} user={user} value={user.id} />
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">SQA</label>
        <div className="flex-1 min-w-0">
          <Select
            value={ticket.sqa_assignee?.id || UNASSIGNED_VALUE}
            onValueChange={(value) => void onSqaAssigneeChange(value === UNASSIGNED_VALUE ? null : value)}
            disabled={!canEditTickets || updatingFields["sqa_assignee_id"] || (isAssignmentLocked && !isSqaEditLocked)}
          >
            <SelectTrigger className="h-8 w-full relative overflow-hidden">
              {ticket.sqa_assignee?.id ? (
                <div className="absolute left-3 right-10 top-0 bottom-0 flex items-center overflow-hidden">
                  <UserSelectValue
                    users={sqaEligibleUsers}
                    value={ticket.sqa_assignee?.id || null}
                    placeholder="Unassigned"
                    unassignedValue={UNASSIGNED_VALUE}
                    unassignedLabel="Unassigned"
                  />
                </div>
              ) : (
                <SelectValue placeholder="Unassigned" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
              {sqaEligibleUsers.map((user) => (
                <UserSelectItem key={user.id} user={user} value={user.id} />
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Type</label>
        <div className="flex-1 min-w-0">
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
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 flex-shrink-0 w-[6.5rem]">Parent</label>
          <div className="flex-1 min-w-0">
            <Popover
              open={isParentPopoverOpen}
              onOpenChange={(open) => {
                setIsParentPopoverOpen(open)
                if (!open) {
                  setParentSearch("")
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEditTickets || isAssignmentLocked || updatingFields["parent_ticket_id"]}
                  className="h-8 w-full justify-between overflow-hidden"
                >
                  <span className="truncate text-xs text-foreground">
                    {selectedParentTicketOption
                      ? `${(selectedParentTicketOption.display_id || selectedParentTicketOption.id.slice(0, 8)).toUpperCase()} · ${selectedParentTicketOption.title}`
                      : "No parent ticket"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                <Input
                  placeholder="Search parent ticket..."
                  value={parentSearch}
                  onChange={(event) => setParentSearch(event.target.value)}
                  className="h-8"
                  autoFocus
                />
                <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                  <button
                    type="button"
                    className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      void onParentTicketChange(NO_PARENT_TICKET_VALUE)
                      setIsParentPopoverOpen(false)
                    }}
                  >
                    <span className="text-xs">No parent ticket</span>
                  </button>
                  {parentFilteredOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-3 text-center">No tickets found</p>
                  ) : (
                    parentFilteredOptions.map((candidate) => {
                      const isSelected = candidate.id === selectedParentTicketId
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          className={[
                            "flex w-full items-start rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                            isSelected ? "bg-muted" : "",
                          ].join(" ")}
                          onClick={() => {
                            void onParentTicketChange(candidate.id)
                            setIsParentPopoverOpen(false)
                          }}
                        >
                          <span className="truncate">
                            {(candidate.display_id || candidate.id.slice(0, 8)).toUpperCase()} · {candidate.title}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {parentNavigationSlug ? (
              <a
                href={`/tickets/${parentNavigationSlug}`}
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Open parent ticket
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
