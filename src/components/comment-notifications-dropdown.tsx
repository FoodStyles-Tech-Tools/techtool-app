"use client"

import { useEffect, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  BellIcon,
  AtSymbolIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/20/solid"
import { Button } from "@client/components/ui/button"
import { LoadingIndicator } from "@client/components/ui/loading-indicator"
import { useCommentNotifications, type CommentNotification } from "@client/hooks/use-comment-notifications"
import { useTicketPreview } from "@client/features/tickets/context/ticket-preview-context"
import { cn } from "@client/lib/utils"
import { richTextToPlainText } from "@shared/rich-text"

function NotificationItem({
  notification,
  onMarkRead,
  onNavigate,
}: {
  notification: CommentNotification
  onMarkRead: (id: string) => void
  onNavigate: (notification: CommentNotification) => void
}) {
  const isUnread = !notification.read_at
  const displayId = notification.ticket?.displayId
  const ticketTitle = notification.ticket?.title?.trim() || "a ticket"
  const authorName = notification.comment?.author?.name || notification.comment?.author?.email || "Someone"
  const typeLabel = notification.type === "mention" ? "mentioned you" : "replied"
  const bodyText = richTextToPlainText(notification.comment?.body)
  const bodySnippet = bodyText ? bodyText.slice(0, 80) + (bodyText.length > 80 ? "..." : "") : ""

  const handleClick = () => {
    if (isUnread) onMarkRead(notification.id)
    onNavigate(notification)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => event.key === "Enter" && handleClick()}
      className={cn(
        "flex cursor-pointer gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-accent/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isUnread && "bg-muted/70"
      )}
    >
      <div className="mt-0.5 shrink-0">
        {notification.type === "mention" ? (
          <AtSymbolIcon className="h-4 w-4 text-primary" />
        ) : (
          <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium leading-tight">
            <span className="font-semibold">{authorName}</span> {typeLabel}
          </p>
          {isUnread ? (
            <span className="inline-flex h-2 w-2 rounded-full bg-primary" aria-label="Unread notification" />
          ) : (
            <span
              className="text-xs text-muted-foreground"
              title={
                notification.read_at
                  ? `Viewed ${formatDistanceToNow(new Date(notification.read_at), { addSuffix: true })}`
                  : ""
              }
            >
              Read
            </span>
          )}
        </div>

        <div className="mt-1 flex min-w-0 items-center gap-2">
          {displayId ? (
            <span className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {displayId}
            </span>
          ) : null}
          <p className="truncate text-xs font-medium text-foreground/90">{ticketTitle}</p>
        </div>

        {bodySnippet ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{bodySnippet}</p> : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          {notification.read_at ? (
            <span className="ml-1">
              {" "}
              - Viewed {formatDistanceToNow(new Date(notification.read_at), { addSuffix: true })}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  )
}

export function CommentNotificationsDropdown() {
  const { openPreview } = useTicketPreview()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useCommentNotifications()

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("click", handleClickOutside, true)
    return () => document.removeEventListener("click", handleClickOutside, true)
  }, [open])

  const handleNavigate = (notification: CommentNotification) => {
    const displayId = notification.ticket?.displayId
    const slug = displayId ? String(displayId).toLowerCase() : notification.ticket_id?.toLowerCase()
    if (slug) {
      openPreview(
        notification.ticket_id
          ? { ticketId: notification.ticket_id, slug }
          : { slug }
      )
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 p-0"
        title="Comment notifications"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>
      {open ? (
      <div className="absolute right-0 z-30 mt-2 w-[380px] rounded-lg border border-border bg-card p-0 shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {unreadCount} unread
              </span>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutateAsync()}
          >
            Mark all read
          </Button>
        </div>
        <div className="max-h-[320px] overflow-y-auto px-4">
          {isLoading ? (
            <div className="py-6">
              <LoadingIndicator variant="block" label="Loading notifications…" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No notifications yet. You will see replies and @mentions here.
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => markRead.mutate(id)}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      ) : null}
    </div>
  )
}


