"use client"

import dynamic from "next/dynamic"
import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { BrandLinkIcon } from "@/components/brand-link-icon"
import { Subtasks } from "@/components/subtasks"
import { TicketActivity } from "@/components/ticket-activity"
import { getSanitizedHtmlProps } from "@/lib/sanitize-html"
import { isRichTextEmpty, toDisplayHtml } from "@/lib/rich-text"
import type { Ticket } from "@/lib/types"
import type { TicketComment } from "@/hooks/use-ticket-comments"
import { ChevronDown, ChevronRight, ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react"

const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor").then((mod) => mod.RichTextEditor),
  { ssr: false }
)

type TicketDetailMainColumnProps = {
  ticketId: string
  ticket: Ticket
  canEditTickets: boolean
  detailComments?: TicketComment[]
  isEditingTitle: boolean
  titleValue: string
  onTitleValueChange: (value: string) => void
  onTitleSave: () => void | Promise<void>
  onTitleKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  onStartTitleEdit: () => void
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
  isEditingTitle,
  titleValue,
  onTitleValueChange,
  onTitleSave,
  onTitleKeyDown,
  onStartTitleEdit,
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
    <div className="space-y-4 min-w-0">
      <Card className="border-0 shadow-none">
        <CardContent className="p-4 pt-4">
          {isEditingTitle ? (
            <Input
              value={titleValue}
              onChange={(event) => onTitleValueChange(event.target.value)}
              onBlur={() => void onTitleSave()}
              onKeyDown={onTitleKeyDown}
              className="h-10 text-xl font-semibold border-2"
              disabled={!canEditTickets}
              autoFocus
            />
          ) : (
            <h1
              className={[
                "text-2xl font-semibold -mx-2 px-2 py-2 rounded-md transition-colors leading-tight",
                canEditTickets ? "cursor-pointer hover:bg-muted/50" : "",
              ].join(" ")}
              onClick={() => {
                if (canEditTickets) {
                  onStartTitleEdit()
                }
              }}
            >
              {ticket.title}
            </h1>
          )}

          {isEditingDescription ? (
            <div className="space-y-2 mt-3">
              <label className="text-sm font-semibold text-foreground">Description</label>
              <RichTextEditor
                value={descriptionValue}
                onChange={onDescriptionValueChange}
                placeholder="Describe this ticket"
                className="border-border/50"
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
                "space-y-2 -mx-2 px-2 py-2 rounded-md transition-colors mt-3",
                canEditTickets ? "cursor-pointer hover:bg-muted/50" : "",
              ].join(" ")}
              onClick={() => {
                if (canEditTickets) {
                  onStartDescriptionEdit()
                }
              }}
            >
              <label className="text-sm font-semibold text-foreground">Description</label>
              {isRichTextEmpty(ticket.description) ? (
                <p className="text-sm text-muted-foreground min-h-[140px] leading-relaxed">
                  <span className="italic text-muted-foreground/70">
                    No description provided. Click to add one.
                  </span>
                </p>
              ) : (
                <div
                  className="rich-text-content min-h-[140px] text-sm text-foreground leading-relaxed"
                  dangerouslySetInnerHTML={
                    getSanitizedHtmlProps(toDisplayHtml(ticket.description)) ?? { __html: "" }
                  }
                />
              )}
            </div>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-foreground">Links</label>
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
                    <Plus className="h-3 w-3 mr-1" />
                    Add URL
                  </Button>
                ) : null}
              </div>
            </div>
            {isAddingLink ? (
              <div className="flex gap-2 mb-2">
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
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            {ticket.links?.length ? (
              <div className="space-y-2 mt-2">
                {ticket.links.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
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
                          <X className="h-4 w-4" />
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
                          <BrandLinkIcon url={url} className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{url}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{formatLinkLabel(url)}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                        </a>
                        {canEditTickets ? (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onStartEditLink(index, url)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void onRemoveLink(index)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : !isAddingLink ? (
              <p className="text-sm text-muted-foreground mt-2">No links attached.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {ticket.type !== "subtask" ? (
        <Card className="border-0 shadow-none">
          <CardHeader className="px-4 pt-4 pb-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left"
              onClick={onToggleSubtasks}
              aria-expanded={!isSubtasksCollapsed}
              aria-controls={subtasksPanelId}
            >
              {isSubtasksCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
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

      <TicketActivity ticketId={ticketId} displayId={ticket.displayId} initialComments={detailComments} />
    </div>
  )
}
