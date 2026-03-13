"use client"

import { cn } from "@client/lib/utils"
import { lazyComponent } from "@client/lib/lazy-component"
import { Badge } from "@client/components/ui/badge"
import { Button } from "@client/components/ui/button"
import { Card } from "@client/components/ui/card"
import { Input } from "@client/components/ui/input"
import { Subtasks } from "@client/components/subtasks"
import { TicketActivity } from "@client/components/ticket-activity"
import { getSanitizedHtmlProps } from "@client/lib/sanitize-html"
import { isRichTextEmpty, toDisplayHtml } from "@shared/rich-text"
import type { Ticket, TicketDetailRelations } from "@shared/types"
import { isArchivedStatus } from "@shared/ticket-statuses"
import type { TicketComment } from "@client/hooks/use-ticket-comments"

const RichTextEditor = lazyComponent(
  () => import("@client/components/rich-text-editor").then((mod) => mod.RichTextEditor),
)

type TicketDetailMainColumnProps = {
  ticketId: string
  ticket: Ticket
  canEditTickets: boolean
  detailComments?: TicketComment[]
  isEditingDescription: boolean
  descriptionValue: string
  onDescriptionValueChange: (value: string) => void
  onDescriptionSave: () => void | Promise<void>
  onCancelDescriptionEdit: () => void
  onStartDescriptionEdit: () => void
  isAddingLink: boolean
  onStartAddLink: () => void
  onCancelAddLink: () => void
  newLinkUrl: string
  onNewLinkUrlChange: (value: string) => void
  onAddLink: () => void | Promise<void>
  editingLinkIndex: number | null
  onStartEditLink: (index: number, url: string) => void
  onCancelEditLink: () => void
  onUpdateLink: (index: number) => void | Promise<void>
  onRemoveLink: (index: number) => void | Promise<void>
  relations?: TicketDetailRelations
}

const formatLinkLabel = (url: string) => {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, "")
  } catch {
    return "External link"
  }
}

export function TicketDetailMainColumn({
  ticketId,
  ticket,
  canEditTickets,
  detailComments,
  isEditingDescription,
  descriptionValue,
  onDescriptionValueChange,
  onDescriptionSave,
  onCancelDescriptionEdit,
  onStartDescriptionEdit,
  isAddingLink,
  onStartAddLink,
  onCancelAddLink,
  newLinkUrl,
  onNewLinkUrlChange,
  onAddLink,
  editingLinkIndex,
  onStartEditLink,
  onCancelEditLink,
  onUpdateLink,
  onRemoveLink,
  relations,
}: TicketDetailMainColumnProps) {
  return (
    <div className="min-w-0 space-y-4">
      <Card className="p-5 shadow-none">
        <h2 className="text-sm font-semibold text-foreground">Overview</h2>
        <div className="mt-3">
          {isEditingDescription ? (
            <div className="space-y-2">
              <RichTextEditor
                value={descriptionValue}
                onChange={onDescriptionValueChange}
                placeholder="Describe this ticket"
                className="border-border"
                activateOnClick
                initialActivated
                onContentKeyDown={(event: KeyboardEvent) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault()
                    void onDescriptionSave()
                    return true
                  }
                  return false
                }}
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  onClick={() => void onDescriptionSave()}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    void onDescriptionSave()
                  }}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancelDescriptionEdit}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onCancelDescriptionEdit()
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "rounded-md px-2 py-2 transition-colors",
                canEditTickets && "cursor-pointer hover:bg-accent"
              )}
              onClick={() => {
                if (canEditTickets) {
                  onStartDescriptionEdit()
                }
              }}
            >
              {isRichTextEmpty(ticket.description) ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="italic text-muted-foreground">
                    No description provided. Click to add one.
                  </span>
                </p>
              ) : (
                <div
                  className="rich-text-content text-sm leading-6 text-muted-foreground"
                  dangerouslySetInnerHTML={
                    getSanitizedHtmlProps(toDisplayHtml(ticket.description)) ?? { __html: "" }
                  }
                />
              )}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase text-muted-foreground">Links</p>
            <div className="flex items-center gap-2">
              {ticket.links?.length ? (
                <Badge variant="outline" className="text-xs">
                  {ticket.links.length} link{ticket.links.length === 1 ? "" : "s"}
                </Badge>
              ) : null}
              {canEditTickets ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onStartAddLink}
                  className="h-6 px-2 text-xs"
                >
                  Add URL
                </Button>
              ) : null}
            </div>
          </div>
          {isAddingLink ? (
            <div className="mb-2 flex gap-2">
              <Input
                placeholder="https://example.com"
                value={newLinkUrl}
                onChange={(event) => onNewLinkUrlChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void onAddLink()
                  } else if (event.key === "Escape") {
                    onCancelAddLink()
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void onAddLink()}
                disabled={!newLinkUrl.trim()}
              >
                Add
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onCancelAddLink}>
                Cancel
              </Button>
            </div>
          ) : null}
          {ticket.links?.length ? (
            <div className="mt-2 space-y-2">
              {ticket.links.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  {editingLinkIndex === index ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={newLinkUrl}
                        onChange={(event) => onNewLinkUrlChange(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            void onUpdateLink(index)
                          } else if (event.key === "Escape") {
                            onCancelEditLink()
                          }
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void onUpdateLink(index)}
                        disabled={!newLinkUrl.trim()}
                      >
                        Save
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={onCancelEditLink}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 flex-1 items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{url}</p>
                          <p className="truncate text-xs text-muted-foreground">{formatLinkLabel(url)}</p>
                        </div>
                        <span className="ml-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open</span>
                      </a>
                      {canEditTickets ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onStartEditLink(index, url)}
                            className="h-7 px-2 text-xs"
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void onRemoveLink(index)}
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : !isAddingLink ? (
            <p className="mt-2 text-sm text-muted-foreground">No links attached.</p>
          ) : null}
        </div>
      </Card>

      {ticket.type !== "subtask" ? (
        <Card className="p-5 shadow-none">
          <h2 className="text-sm font-semibold text-foreground">Subtasks</h2>
          <div className="mt-3">
            <Subtasks
              ticketId={ticketId}
              projectName={ticket.project?.name || null}
              displayId={ticket.displayId}
              projectId={ticket.project?.id ?? null}
              parentTitle={ticket.title}
              parentDepartmentId={ticket.department?.id ?? null}
              parentRequestedById={ticket.requestedBy?.id ?? null}
              allowSqaStatuses={ticket.project?.require_sqa === true}
              allowCreate={canEditTickets && ticket.type !== "subtask"}
              initialSubtasks={relations?.subtasks?.map((subtask) => ({
                id: subtask.id,
                displayId: subtask.displayId,
                title: subtask.title,
                status: subtask.status,
                type: subtask.type,
                priority: subtask.priority,
                assigneeName: subtask.assignee?.name || subtask.assignee?.email || null,
              }))}
            />
          </div>
        </Card>
      ) : null}

      <Card className="p-5 shadow-none">
        <TicketActivity
          ticketId={ticketId}
          displayId={ticket.displayId}
          initialComments={detailComments}
          readOnly={isArchivedStatus(ticket.status)}
        />
      </Card>
    </div>
  )
}
