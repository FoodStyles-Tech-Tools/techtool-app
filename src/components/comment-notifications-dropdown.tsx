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
  const mainText = displayId ? `${authorName} ${typeLabel} in ${displayId}` : `${authorName} ${typeLabel}`

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
        "flex cursor-pointer gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isUnread && "bg-muted/70 font-semibold"
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
        <p className="truncate text-sm text-foreground">{mainText}</p>
        {bodySnippet ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{bodySnippet}</p>
        ) : null}
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          {notification.read_at
            ? ` · Viewed ${formatDistanceToNow(new Date(notification.read_at), { addSuffix: true })}`
            : ""}
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
      <div className="absolute right-0 z-30 mt-2 w-[380px] rounded-xl border border-border/80 bg-card/95 p-0 shadow-xl backdrop-blur-sm">
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


