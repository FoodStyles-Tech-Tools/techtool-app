"use client"

import { useId, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TicketComments } from "@/components/ticket-comments"
import { useTicketActivity, type TicketActivityItem } from "@/hooks/use-ticket-activity"
import type { TicketComment } from "@/hooks/use-ticket-comments"
import { TicketPriorityIcon } from "@/components/ticket-priority-select"
import { formatStatusLabel } from "@/lib/ticket-statuses"
import { cn } from "@/lib/utils"

interface TicketActivityProps {
  ticketId: string
  displayId?: string | null
  initialComments?: TicketComment[]
}

type ActivityTab = "all" | "comments" | "history"

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
    const trimmed = value.trim()

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
    return <span className="text-sm text-muted-foreground">None</span>
  }

  const isStatus = fieldName === "status"
  const isPriority = fieldName === "priority"

  if (isStatus || isPriority) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-4",
          isNewValue
            ? "border-blue-500/60 bg-blue-500/10 text-blue-600 dark:text-blue-300"
            : "border-border bg-muted/40 text-foreground",
          isStatus ? "tracking-wide uppercase" : ""
        )}
      >
        {isPriority && typeof value === "string" && (
          <TicketPriorityIcon priority={value.toLowerCase()} className="h-3 w-3" />
        )}
        {text}
      </span>
    )
  }

  return <span className="text-sm text-foreground">{text}</span>
}

export function TicketActivity({ ticketId, displayId, initialComments }: TicketActivityProps) {
  const panelId = useId()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<ActivityTab>("all")
  const { data, isLoading, error } = useTicketActivity(ticketId, {
    enabled: !!ticketId && !isCollapsed && activeTab !== "comments",
  })

  const activities = data?.activities || []
  const historyItems = useMemo(
    () => activities.filter((item) => !item.event_type.startsWith("comment_")),
    [activities]
  )
  const activityItems = activeTab === "history" ? historyItems : activities

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-4 pt-4 pb-2">
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-expanded={!isCollapsed}
          aria-controls={panelId}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <CardTitle className="text-base">Activity</CardTitle>
        </button>
      </CardHeader>

      {!isCollapsed && (
        <CardContent id={panelId} className="px-4 pb-4 pt-0">
          <div className="mb-3 inline-flex items-center rounded-md border border-border/60 bg-muted/30 p-0.5">
            <Button
              variant={activeTab === "all" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-7 text-xs px-3", activeTab === "all" ? "shadow-none" : "")}
              onClick={() => setActiveTab("all")}
            >
              All
            </Button>
            <Button
              variant={activeTab === "comments" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-7 text-xs px-3", activeTab === "comments" ? "shadow-none" : "")}
              onClick={() => setActiveTab("comments")}
            >
              Comments
            </Button>
            <Button
              variant={activeTab === "history" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-7 text-xs px-3", activeTab === "history" ? "shadow-none" : "")}
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
            />
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Loading activity...</p>
          ) : error ? (
            <p className="text-sm text-destructive">Failed to load activity.</p>
          ) : activityItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {activeTab === "history" ? "No history yet." : "No activity yet."}
            </p>
          ) : (
            <div className="space-y-5">
              {activityItems.map((item) => {
                const actorName = getActorName(item)
                const showValueTransition =
                  item.event_type === "ticket_field_changed" || item.event_type === "subtask_renamed"

                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={item.actor?.avatar_url || undefined} alt={actorName} />
                      <AvatarFallback className="text-[11px]">
                        {getActorInitials(actorName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-5 text-foreground">
                        <span className="font-semibold">{actorName}</span> {formatHistoryAction(item)}
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>

                      {showValueTransition && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {renderHistoryValue(item.field_name, item.old_value, false)}
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          {renderHistoryValue(item.field_name, item.new_value, true)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
