"use client"

import { Link, useNavigate } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import {
  BellIcon,
  AtSymbolIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/20/solid"
import { Button } from "@client/components/ui/button"
import { useCommentNotifications, type CommentNotification } from "@client/hooks/use-comment-notifications"
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
  const displayId = notification.ticket?.displayId || notification.ticket_id?.slice(0, 8)
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
        "flex cursor-pointer gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        isUnread && "border-l-2 border-slate-900 bg-slate-50"
      )}
    >
      <div className="mt-0.5 shrink-0">
        {notification.type === "mention" ? (
          <AtSymbolIcon className="h-4 w-4 text-blue-500" />
        ) : (
          <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-slate-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium leading-tight">
            <span className="font-semibold">{authorName}</span> {typeLabel} on{" "}
            <span className="font-mono text-slate-900">{displayId}</span>
          </p>
          {isUnread ? (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-white">
              Unread
            </span>
          ) : (
            <span
              className="text-xs text-slate-500"
              title={
                notification.read_at
                  ? `Viewed ${formatDistanceToNow(new Date(notification.read_at), { addSuffix: true })}`
                  : ""
              }
            >
              Viewed
            </span>
          )}
        </div>
        {bodySnippet ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{bodySnippet}</p> : null}
        <p className="mt-1 text-xs text-slate-500">
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
  const navigate = useNavigate()
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useCommentNotifications()

  const handleNavigate = (notification: CommentNotification) => {
    const displayId = notification.ticket?.displayId
    if (displayId) {
      navigate(`/tickets/${displayId}`)
    }
  }

  return (
    <details className="relative">
      <summary className="list-none [&::-webkit-details-marker]:hidden">
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0" title="Comment notifications" aria-label="Notifications">
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-medium text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </summary>
      <div className="absolute right-0 z-30 mt-2 ml-2 w-[360px] rounded-lg border border-slate-200 bg-white p-0 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 ? (
            <Button variant="ghost" size="sm" className="h-7" onClick={() => markAllRead.mutateAsync()}>
              Mark all read
            </Button>
          ) : null}
        </div>
        <div className="max-h-[320px] overflow-y-auto px-4">
          {isLoading ? null : notifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
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
        {notifications.length > 0 ? (
          <div className="border-t border-slate-200 px-4 py-2">
            <Link to="/tickets" className="text-xs text-slate-900 hover:underline">
              View all tickets
            </Link>
          </div>
        ) : null}
      </div>
    </details>
  )
}


