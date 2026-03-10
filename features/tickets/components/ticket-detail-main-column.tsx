"use client"

import dynamic from "next/dynamic"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Subtasks } from "@/components/subtasks"
import { TicketActivity } from "@/components/ticket-activity"
import { getSanitizedHtmlProps } from "@/lib/sanitize-html"
import { isRichTextEmpty, toDisplayHtml } from "@/lib/rich-text"
import type { Ticket } from "@/lib/types"
import type { TicketComment } from "@/hooks/use-ticket-comments"

const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor").then((mod) => mod.RichTextEditor),
  { ssr: false }
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
  isSubtasksCollapsed: boolean
  onToggleSubtasks: () => void
  subtasksPanelId: string
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
  isSubtasksCollapsed,
  onToggleSubtasks,
  subtasksPanelId,
}: TicketDetailMainColumnProps) {
  return (
    <div className="min-w-0 space-y-4">
      <Card className="shadow-none">
        <CardHeader className="px-4 pb-2 pt-4">
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {isEditingDescription ? (
            <div className="space-y-2">
              <RichTextEditor
                value={descriptionValue}
                onChange={onDescriptionValueChange}
                placeholder="Describe this ticket"
                className="border-slate-200"
                activateOnClick
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
                <Button size="sm" onClick={() => void onDescriptionSave()}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelDescriptionEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={[
                "-mx-2 space-y-2 rounded-md px-2 py-2 transition-colors",
                canEditTickets ? "cursor-pointer hover:bg-slate-50" : "",
              ].join(" ")}
              onClick={() => {
                if (canEditTickets) {
                  onStartDescriptionEdit()
                }
              }}
            >
              {isRichTextEmpty(ticket.description) ? (
                <p className="min-h-[140px] text-sm leading-relaxed text-slate-500">
                  <span className="italic text-slate-400">
                    No description provided. Click to add one.
                  </span>
                </p>
              ) : (
                <div
                  className="rich-text-content min-h-[140px] text-sm text-slate-900 leading-relaxed"
                  dangerouslySetInnerHTML={
                    getSanitizedHtmlProps(toDisplayHtml(ticket.description)) ?? { __html: "" }
                  }
                />
              )}
            </div>
          )}

          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900">Links</label>
              <div className="flex items-center gap-2">
                {ticket.links?.length ? (
                  <Badge variant="outline" className="text-[11px]">
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
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm transition-colors hover:bg-slate-50"
                  >
                    {editingLinkIndex === index ? (
                      <div className="flex items-center gap-2 flex-1">
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
                          className="flex items-center gap-2 min-w-0 flex-1"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{url}</p>
                            <p className="truncate text-[11px] text-slate-500">{formatLinkLabel(url)}</p>
                          </div>
                          <span className="ml-2 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Open</span>
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
              <p className="mt-2 text-sm text-slate-500">No links attached.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <TicketActivity ticketId={ticketId} displayId={ticket.displayId} initialComments={detailComments} />

      {ticket.type !== "subtask" ? (
        <Card className="shadow-none">
          <CardHeader className="px-4 pt-4 pb-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left"
              onClick={onToggleSubtasks}
              aria-expanded={!isSubtasksCollapsed}
              aria-controls={subtasksPanelId}
            >
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {isSubtasksCollapsed ? "Show" : "Hide"}
              </span>
              <CardTitle className="text-base">Subtasks</CardTitle>
            </button>
          </CardHeader>
          {!isSubtasksCollapsed ? (
            <CardContent id={subtasksPanelId} className="px-4 pb-4 pt-0">
              <Subtasks
                ticketId={ticketId}
                projectName={ticket.project?.name || null}
                displayId={ticket.displayId}
                projectId={ticket.project?.id || null}
                allowSqaStatuses={ticket.project?.require_sqa === true}
                allowCreate={ticket.type !== "subtask"}
              />
            </CardContent>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}
