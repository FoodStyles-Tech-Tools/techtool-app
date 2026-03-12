"use client"

import { useId, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@client/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@client/components/ui/avatar"
import { DataState } from "@client/components/ui/data-state"
import { TicketComments } from "@client/components/ticket-comments"
import { useTicketActivity, type TicketActivityItem } from "@client/hooks/use-ticket-activity"
import type { TicketComment } from "@client/hooks/use-ticket-comments"
import { formatStatusLabel } from "@shared/ticket-statuses"
import { cn } from "@client/lib/utils"
import { richTextToPlainText } from "@shared/rich-text"

interface TicketActivityProps {
  ticketId: string
  displayId?: string | null
  initialComments?: TicketComment[]
  /** When true, comments are read-only (no add/reply/edit/delete). Used for archived tickets. */
  readOnly?: boolean
}

type ActivityTab = "comments" | "history"

const FIELD_LABELS: Record<string, string> = {
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  type: "type",
  due_date: "due date",
  assignee_id: "assignee",
  sqa_assignee_id: "SQA assignee",
  requested_by_id: "reporter",
  department_id: "department",
  project_id: "project",
  epic_id: "epic",
  sprint_id: "sprint",
  assigned_at: "assigned date",
  sqa_assigned_at: "SQA assigned date",
  started_at: "started date",
  completed_at: "completed date",
  links: "links",
  reason: "reason",
}

function asShortText(value: unknown): string {
  if (value == null) return "empty"
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return "empty"
    return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`
  return "updated"
}

function metadataString(item: TicketActivityItem, key: string): string | null {
  const value = item.metadata?.[key]
  return typeof value === "string" && value.trim() ? value : null
}

function sentenceCase(value: string): string {
  if (!value) return value
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function getActorName(item: TicketActivityItem): string {
  return item.actor?.name || item.actor?.email || "System"
}

function getActorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "SY"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase()
}

function getFieldLabel(fieldName: string | null, forSentence = false): string {
  if (!fieldName) return forSentence ? "Field" : "field"
  const label = FIELD_LABELS[fieldName] || fieldName.replace(/_/g, " ")
  return forSentence ? sentenceCase(label) : label
}

function formatHistoryAction(item: TicketActivityItem): string {
  switch (item.event_type) {
    case "ticket_created":
      return "created this ticket"
    case "ticket_field_changed":
      return `changed the ${getFieldLabel(item.field_name, true)}`
    case "comment_added":
      return "added a comment"
    case "comment_edited":
      return "edited a comment"
    case "comment_deleted":
      return "deleted a comment"
    case "subtask_added":
      return `added subtask \"${metadataString(item, "title") || "Untitled"}\"`
    case "subtask_renamed":
      return "renamed a subtask"
    case "subtask_completed":
      return `completed subtask \"${metadataString(item, "title") || "Untitled"}\"`
    case "subtask_reopened":
      return `reopened subtask \"${metadataString(item, "title") || "Untitled"}\"`
    case "subtask_deleted":
      return `deleted subtask \"${metadataString(item, "title") || "Untitled"}\"`
    default:
      return "updated this ticket"
  }
}

function isEmptyValue(value: unknown): boolean {
  return (
    value == null ||
    (typeof value === "string" && value.trim().length === 0) ||
    (Array.isArray(value) && value.length === 0)
  )
}

function formatHistoryValueText(fieldName: string | null, value: unknown): string {
  if (isEmptyValue(value)) return "None"

  if (typeof value === "string") {
    const normalized = fieldName === "description" ? richTextToPlainText(value) : value
    const trimmed = normalized.trim()

    if (fieldName === "status") {
      return formatStatusLabel(trimmed).toUpperCase()
    }

    if (fieldName === "priority") {
      return sentenceCase(trimmed.toLowerCase())
    }

    if (fieldName === "due_date" || fieldName?.endsWith("_at")) {
      const parsed = new Date(trimmed)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleString()
      }
    }

    if (fieldName?.endsWith("_id") && /^[0-9a-f]{8}-/i.test(trimmed)) {
      return `${trimmed.slice(0, 8)}...`
    }

    return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`
  }

  return asShortText(value)
}

function renderHistoryValue(fieldName: string | null, value: unknown, isNewValue: boolean) {
  const text = formatHistoryValueText(fieldName, value)

  if (text === "None") {
    return <span className="text-sm text-slate-500">None</span>
  }

  const isStatus = fieldName === "status"
  const isPriority = fieldName === "priority"

  if (isStatus || isPriority) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium leading-4",
          isNewValue
            ? "border-slate-300 bg-slate-100 text-slate-900"
            : "border-slate-200 bg-white text-slate-900",
          isStatus ? "tracking-wide uppercase" : ""
        )}
      >
        {text}
      </span>
    )
  }

  return <span className="text-sm text-slate-900">{text}</span>
}

export function TicketActivity({ ticketId, displayId, initialComments, readOnly = false }: TicketActivityProps) {
  const panelId = useId()
  const [activeTab, setActiveTab] = useState<ActivityTab>("comments")
  const { data, isLoading, error } = useTicketActivity(ticketId, {
    enabled: !!ticketId && activeTab === "history",
  })

  const activities = useMemo(() => data?.activities ?? [], [data?.activities])
  const historyItems = useMemo(
    () => activities.filter((item) => !item.event_type.startsWith("comment_")),
    [activities]
  )
  const activityItems = activeTab === "history" ? historyItems : activities

  return (
    <section id={panelId} className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Activity</h2>

      <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5">
        <Button
          variant={activeTab === "comments" ? "selected" : "ghost"}
          size="sm"
          className={cn("h-7 px-3", activeTab === "comments" ? "shadow-none" : "")}
          onClick={() => setActiveTab("comments")}
        >
          Comments
        </Button>
        <Button
          variant={activeTab === "history" ? "selected" : "ghost"}
          size="sm"
          className={cn("h-7 px-3", activeTab === "history" ? "shadow-none" : "")}
          onClick={() => setActiveTab("history")}
        >
          History
        </Button>
      </div>

          {activeTab === "comments" ? (
            <TicketComments
              ticketId={ticketId}
              displayId={displayId}
              initialComments={initialComments}
              showHeader={false}
              composerFirst
              readOnly={readOnly}
            />
          ) : (
            <DataState
              loading={isLoading}
              error={error ? "Failed to load activity." : null}
              isEmpty={!isLoading && activityItems.length === 0}
              loadingTitle="Loading activity"
              loadingDescription="The ticket timeline is being prepared."
              emptyTitle={activeTab === "history" ? "No history yet" : "No activity yet"}
              emptyDescription="Updates and changes for this ticket will appear here."
            >
              <div className="space-y-5">
                {activityItems.map((item) => {
                  const actorName = getActorName(item)
                  const showValueTransition =
                    item.event_type === "ticket_field_changed" || item.event_type === "subtask_renamed"

                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={item.actor?.avatar_url || undefined} alt={actorName} />
                        <AvatarFallback className="text-xs">
                          {getActorInitials(actorName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-5 text-slate-900">
                          <span className="font-semibold">{actorName}</span> {formatHistoryAction(item)}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </p>

                        {showValueTransition && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {renderHistoryValue(item.field_name, item.old_value, false)}
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">to</span>
                            {renderHistoryValue(item.field_name, item.new_value, true)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </DataState>
          )}
    </section>
  )
}
