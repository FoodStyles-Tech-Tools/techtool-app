"use client"

import { useState, useEffect, memo } from "react"
import dynamic from "next/dynamic"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTicketComments, type TicketComment } from "@/hooks/use-ticket-comments"
import { useCommentNotifications } from "@/hooks/use-comment-notifications"
import { useUsers } from "@/hooks/use-users"
import { useSession } from "@/lib/auth-client"
import { usePermissions } from "@/hooks/use-permissions"
import { toast } from "@/components/ui/toast"
import { MessageSquare, Reply, Pencil, Trash2, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSanitizedHtmlProps } from "@/lib/sanitize-html"
import { isRichTextEmpty, toDisplayHtml } from "@/lib/rich-text"

const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor").then((mod) => mod.RichTextEditor),
  { ssr: false }
)

interface TicketCommentsProps {
  ticketId: string
  displayId?: string | null
  /** When provided (e.g. from ticket detail), comments are not fetched again and no loading state is shown. */
  initialComments?: TicketComment[]
  /** Hide title/count when rendered inside Activity tab. */
  showHeader?: boolean
  /** Place root comment composer before list. */
  composerFirst?: boolean
}

const CommentBody = memo(function CommentBody({
  body,
  mentions,
}: {
  body: string
  mentions: { user_id: string; user?: { id: string; name: string | null; email: string } }[]
}) {
  const mentionLabelMap = new Map<string, string>()
  mentions.forEach((mention) => {
    const label = mention.user?.name || mention.user?.email
    if (label) mentionLabelMap.set(mention.user_id, label)
  })

  let html = toDisplayHtml(body) ?? ""
  mentionLabelMap.forEach((label) => {
    const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const mentionRegex = new RegExp(`@${safeLabel}`, "gi")
    html = html.replace(
      mentionRegex,
      `<span class="inline-flex rounded bg-primary/10 px-1 font-medium text-primary">@${label}</span>`
    )
  })

  return (
    <div
      className="rich-text-content text-sm text-foreground"
      dangerouslySetInnerHTML={getSanitizedHtmlProps(html) ?? { __html: "" }}
    />
  )
})

const RepliesBlock = memo(function RepliesBlock({
  replies,
  rootCommentId,
  users,
  currentUserId,
  canEdit,
  onReply,
  onStartEdit,
  onDelete,
  onHoverChange,
}: {
  replies: TicketComment[]
  rootCommentId: string
  users: { id: string; name: string | null; email: string }[]
  currentUserId: string | null
  canEdit: boolean
  onReply: (comment: TicketComment, replyTargetId?: string) => void
  onStartEdit: (comment: TicketComment) => void
  onDelete: (comment: TicketComment) => void
  onHoverChange?: (commentId: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const count = replies.length
  if (count === 0) return null
  return (
    <div className="mt-3 pl-4">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          See {count} {count === 1 ? "reply" : "replies"}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline mb-2"
          >
            Hide replies
          </button>
          <div className="space-y-1">
            {replies.map((reply) => (
              <CommentRow
                key={reply.id}
                comment={reply}
                users={users}
                currentUserId={currentUserId}
                canEdit={canEdit}
                onReply={onReply}
                replyTargetId={rootCommentId}
                onStartEdit={onStartEdit}
                onDelete={onDelete}
                isReply
                onHoverChange={onHoverChange}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
})

const CommentRow = memo(function CommentRow({
  comment,
  users,
  currentUserId,
  canEdit,
  onReply,
  replyTargetId,
  onStartEdit,
  onDelete,
  isReply,
  onHoverChange,
  isHovered,
}: {
  comment: TicketComment
  users: { id: string; name: string | null; email: string }[]
  currentUserId: string | null
  canEdit: boolean
  onReply: (comment: TicketComment, replyTargetId?: string) => void
  replyTargetId?: string
  onStartEdit: (comment: TicketComment) => void
  onDelete: (comment: TicketComment) => void
  isReply?: boolean
  onHoverChange?: (commentId: string | null) => void
  isHovered?: boolean
}) {
  const isOwn = currentUserId === comment.author_id
  const displayName = comment.author?.name || comment.author?.email || "Unknown"
  const initials = displayName.slice(0, 2).toUpperCase()
  const canReply = canEdit
  const canHotkeyReply = canEdit && !isReply

  const content = (
    <div className={cn("flex gap-2.5", isReply && "mt-2.5")}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={comment.author?.avatar_url || comment.author?.image || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{displayName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              {comment.updated_at && comment.updated_at !== comment.created_at && (
                <span className="ml-1">(edited)</span>
              )}
            </span>
          </div>
          {isOwn && canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Comment options"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onStartEdit(comment)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(comment)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="mt-0.5 text-sm text-foreground">
          <CommentBody
            body={comment.body}
            mentions={comment.mentions}
          />
        </div>
        {canReply && (
          <div className={cn("flex items-center gap-1 mt-1.5", isReply && "-ml-4")}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => onReply(comment, replyTargetId)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          </div>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <RepliesBlock
            replies={comment.replies}
            rootCommentId={replyTargetId ?? comment.id}
            users={users}
            currentUserId={currentUserId}
            canEdit={canEdit}
            onReply={onReply}
            onStartEdit={onStartEdit}
            onDelete={onDelete}
            onHoverChange={onHoverChange}
          />
        )}
      </div>
    </div>
  )

  if (canHotkeyReply && onHoverChange) {
    return (
      <div
        className={cn(
          "rounded-lg transition-colors -mx-1.5 px-1.5 py-1 -my-0.5",
          isHovered && "bg-muted/60 ring-1 ring-border/50"
        )}
        onMouseEnter={() => onHoverChange(comment.id)}
        onMouseLeave={() => onHoverChange(null)}
        title="Press R to reply"
      >
        {content}
      </div>
    )
  }

  return content
})

function CommentComposer({
  placeholder = "Add a comment...",
  onSubmit,
  onCancel,
  initialBody = "",
  initialMentionIds = [],
}: {
  placeholder?: string
  onSubmit: (body: string, mentionUserIds: string[]) => Promise<{ body: string; parent_id?: string; mention_user_ids?: string[] }>
  onCancel?: () => void
  initialBody?: string
  initialMentionIds?: string[]
}) {
  const [body, setBody] = useState(initialBody)
  const [mentionUserIds] = useState<string[]>(initialMentionIds)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (isRichTextEmpty(body)) return
    setSubmitting(true)
    try {
      const value = body.trim()
      await onSubmit(value, mentionUserIds)
      setBody("")
      onCancel?.()
    } finally {
      setSubmitting(false)
    }
  }

  const hasText = !isRichTextEmpty(body)
  const showSend = hasText || submitting
  const showActions = Boolean(onCancel) || showSend

  return (
    <div className="space-y-2 mt-1.5 relative">
      <RichTextEditor
        value={body}
        onChange={setBody}
        placeholder={placeholder}
        className="border-border/50"
        compact
        activateOnClick
      />
      {showActions && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {showSend && (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
                className="gap-1.5"
              >
                <span>{submitting ? "Sending..." : "Send"}</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function TicketComments({
  ticketId,
  displayId,
  initialComments,
  showHeader = true,
  composerFirst = false,
}: TicketCommentsProps) {
  const { data: session } = useSession()
  const { flags } = usePermissions()
  const { data: usersData } = useUsers()
  const users = usersData || []
  const currentUserId = users.find((u) => u.email === session?.user?.email)?.id ?? null
  const canEdit = flags?.canEditTickets ?? false

  const initialData =
    initialComments != null
      ? { comments: initialComments, ticket: { id: ticketId, display_id: displayId ?? null } }
      : undefined

  const {
    comments,
    isLoading,
    error,
    addComment,
    updateComment,
    deleteComment,
  } = useTicketComments(ticketId, { enabled: !!ticketId, initialData })

  const { markTicketRead } = useCommentNotifications()

  useEffect(() => {
    if (ticketId) markTicketRead.mutate(ticketId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]) // markTicketRead is stable from React Query, no need to include

  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyPrefill, setReplyPrefill] = useState<{ mentionUserId: string; mentionLabel: string } | null>(null)
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<TicketComment | null>(null)
  const [editBody, setEditBody] = useState("")

  const getReplyMentionSeed = (comment: TicketComment | undefined) => {
    if (!comment?.author_id) return null
    return {
      mentionUserId: comment.author_id,
      mentionLabel: comment.author?.name || comment.author?.email || "User",
    }
  }

  const findRootCommentById = (commentId: string) => comments.find((comment) => comment.id === commentId)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "r" && e.key !== "R") return
      const target = e.target as HTMLElement | null
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable
      if (isInput) return
      if (!hoveredCommentId) return
      e.preventDefault()
      setReplyingToId(hoveredCommentId)
      setReplyPrefill(getReplyMentionSeed(findRootCommentById(hoveredCommentId)))
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [hoveredCommentId, comments])

  const handleReply = (comment: TicketComment, replyTargetId?: string) => {
    setReplyingToId(replyTargetId ?? comment.id)
    setReplyPrefill(getReplyMentionSeed(comment))
  }

  const handleSubmitReply = (parentId: string) => {
    return async (body: string, mentionUserIds: string[]) => {
      await addComment.mutateAsync({
        body,
        parent_id: parentId,
        mention_user_ids: mentionUserIds,
      })
      setReplyingToId(null)
      setReplyPrefill(null)
      return { body, parent_id: parentId, mention_user_ids: mentionUserIds }
    }
  }

  const handleStartEdit = (comment: TicketComment) => {
    setEditingComment(comment)
    setEditBody(comment.body)
  }

  const handleSaveEdit = async () => {
    if (!editingComment) return
    if (isRichTextEmpty(editBody)) {
      toast("Comment cannot be empty", "error")
      return
    }
    try {
      await updateComment.mutateAsync({
        commentId: editingComment.id,
        body: editBody.trim(),
      })
      toast("Comment updated")
      setEditingComment(null)
      setEditBody("")
    } catch (e: any) {
      toast(e.message || "Failed to update comment", "error")
    }
  }

  const handleDelete = async (comment: TicketComment) => {
    if (!confirm("Delete this comment?")) return
    try {
      await deleteComment.mutateAsync(comment.id)
      toast("Comment deleted")
    } catch (e: any) {
      toast(e.message || "Failed to delete comment", "error")
    }
  }

  const rootComposer = canEdit ? (
    <div className={cn(composerFirst ? "pb-2" : "pt-2 border-t")}>
      <CommentComposer
        placeholder="Add a comment..."
        onSubmit={async (body, mentionUserIds) => {
          await addComment.mutateAsync({
            body,
            mention_user_ids: mentionUserIds,
          })
          return { body, mention_user_ids: mentionUserIds }
        }}
      />
    </div>
  ) : null

  if (error) {
    return (
      <Card className="border-0 shadow-none">
        <CardContent className="px-4 pb-4 pt-4">
          <p className="text-sm text-destructive">Failed to load comments.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-none">
      {showHeader && (
        <CardHeader className="px-4 pt-4 pb-1.5">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments
            {comments.length > 0 && (
              <span className="text-muted-foreground font-normal text-sm">
                ({comments.length} root)
              </span>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn("px-4 pb-4 space-y-3", showHeader ? "pt-0" : "pt-1")}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        ) : (
          <>
            {composerFirst && rootComposer}
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id}>
                    {editingComment?.id === comment.id ? (
                      <div className="space-y-2">
                        <RichTextEditor
                          value={editBody}
                          onChange={setEditBody}
                          placeholder="Edit comment"
                          className="border-border/50"
                          compact
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit} disabled={isRichTextEmpty(editBody)}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingComment(null)
                              setEditBody("")
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <CommentRow
                        comment={comment}
                        users={users}
                        currentUserId={currentUserId}
                        canEdit={canEdit}
                        onReply={handleReply}
                        onStartEdit={handleStartEdit}
                        onDelete={handleDelete}
                        onHoverChange={setHoveredCommentId}
                        isHovered={hoveredCommentId === comment.id}
                      />
                    )}
                    {replyingToId === comment.id && (
                      <div className="ml-[38px] pl-4 mt-1.5">
                        <CommentComposer
                          placeholder="Write a reply..."
                          onSubmit={handleSubmitReply(comment.id)}
                          onCancel={() => {
                            setReplyingToId(null)
                            setReplyPrefill(null)
                          }}
                          initialBody={replyPrefill?.mentionLabel ? `@${replyPrefill.mentionLabel} ` : ""}
                          initialMentionIds={replyPrefill?.mentionUserId ? [replyPrefill.mentionUserId] : []}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!composerFirst && rootComposer}
          </>
        )}
      </CardContent>
    </Card>
  )
}
