"use client"

import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCommentNotifications, type CommentNotification } from "@/hooks/use-comment-notifications"
import { Bell, MessageSquare, AtSign, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

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
  const displayId = notification.ticket?.display_id || notification.ticket_id?.slice(0, 8)
  const authorName = notification.comment?.author?.name || notification.comment?.author?.email || "Someone"
  const typeLabel = notification.type === "mention" ? "mentioned you" : "replied"
  const bodySnippet = notification.comment?.body
    ? notification.comment.body.slice(0, 80) + (notification.comment.body.length > 80 ? "…" : "")
    : ""

  const handleClick = () => {
    if (isUnread) onMarkRead(notification.id)
    onNavigate(notification)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={cn(
        "flex gap-3 px-2 py-2.5 text-left rounded-md cursor-pointer transition-colors hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring",
        isUnread && "bg-primary/5 border-l-2 border-l-primary"
      )}
    >
      <div className="shrink-0 mt-0.5">
        {notification.type === "mention" ? (
          <AtSign className="h-4 w-4 text-primary" />
        ) : (
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium leading-tight">
            <span className="font-semibold">{authorName}</span> {typeLabel} on{" "}
            <span className="font-mono text-primary">{displayId}</span>
          </p>
          {isUnread ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-primary bg-primary/15 px-1.5 py-0.5 rounded">
              Unread
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground" title={notification.read_at ? `Viewed ${formatDistanceToNow(new Date(notification.read_at), { addSuffix: true })}` : ""}>
              Viewed
            </span>
          )}
        </div>
        {bodySnippet && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {bodySnippet}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          {notification.read_at && (
            <span className="ml-1">· Viewed {formatDistanceToNow(new Date(notification.read_at), { addSuffix: true })}</span>
          )}
        </p>
      </div>
    </div>
  )
}

export function CommentNotificationsDropdown() {
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
  } = useCommentNotifications()

  const handleNavigate = (notification: CommentNotification) => {
    const displayId = notification.ticket?.display_id
    if (displayId) {
      router.push(`/tickets/${displayId}`)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          title="Comment notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[360px] p-0 ml-2">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutateAsync()}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[320px] overflow-y-auto px-4">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No notifications yet. You’ll see replies and @mentions here.
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => markRead.mutate(id)}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Link
              href="/tickets"
              className="text-xs text-primary hover:underline"
            >
              View all tickets
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
