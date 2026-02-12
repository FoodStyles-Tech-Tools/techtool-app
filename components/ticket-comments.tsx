"use client"

import { useState, useRef, useEffect, useLayoutEffect, memo, useMemo } from "react"
import { createPortal } from "react-dom"

function useIsMac() {
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /Mac|iPad|iPhone/i.test(navigator.platform))
  }, [])
  return isMac
}
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { MessageSquare, Reply, Pencil, Trash2, AtSign, Send, X, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface TicketCommentsProps {
  ticketId: string
  displayId?: string | null
}

const CommentBody = memo(function CommentBody({
  body,
  mentions,
  users,
}: {
  body: string
  mentions: { user_id: string; user?: { id: string; name: string | null; email: string } }[]
  users: { id: string; name: string | null; email: string }[]
}) {
  if (!mentions.length) {
    return <span className="whitespace-pre-wrap break-words">{body}</span>
  }
  const mentionIds = new Set(mentions.map((m) => m.user_id))
  const getUserName = (id: string) => {
    const m = mentions.find((x) => x.user_id === id)
    if (m?.user?.name) return m.user.name
    if (m?.user?.email) return m.user.email
    return users.find((u) => u.id === id)?.name || users.find((u) => u.id === id)?.email || "User"
  }
  const parts: { type: "text" | "mention"; value: string; userId?: string }[] = []
  let remaining = body
  const regex = /@(\S+)/g
  let match
  let lastIndex = 0
  while ((match = regex.exec(body)) !== null) {
    const possibleId = match[1]
    const possibleName = match[1]
    const byId = mentionIds.has(possibleId) ? possibleId : null
    const byName = Array.from(mentionIds).find((id) => {
      const name = getUserName(id)
      return name && name.toLowerCase().includes(possibleName.toLowerCase())
    })
    const userId = byId || byName
    if (userId) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", value: body.slice(lastIndex, match.index) })
      }
      parts.push({ type: "mention", value: `@${getUserName(userId)}`, userId })
      lastIndex = regex.lastIndex
    }
  }
  if (lastIndex < body.length) {
    parts.push({ type: "text", value: body.slice(lastIndex) })
  }
  if (parts.length === 0) {
    return <span className="whitespace-pre-wrap break-words">{body}</span>
  }
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((p, i) =>
        p.type === "mention" ? (
          <span
            key={i}
            className="font-medium text-primary bg-primary/10 px-1 rounded"
          >
            {p.value}
          </span>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </span>
  )
})

const RepliesBlock = memo(function RepliesBlock({
  replies,
  users,
  currentUserId,
  canEdit,
  onReply,
  onStartEdit,
  onDelete,
  onHoverChange,
}: {
  replies: TicketComment[]
  users: { id: string; name: string | null; email: string }[]
  currentUserId: string | null
  canEdit: boolean
  onReply: (parentId: string) => void
  onStartEdit: (comment: TicketComment) => void
  onDelete: (comment: TicketComment) => void
  onHoverChange?: (commentId: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const count = replies.length
  if (count === 0) return null
  return (
    <div className="mt-3">
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
  onReply: (parentId: string) => void
  onStartEdit: (comment: TicketComment) => void
  onDelete: (comment: TicketComment) => void
  isReply?: boolean
  onHoverChange?: (commentId: string | null) => void
  isHovered?: boolean
}) {
  const isOwn = currentUserId === comment.author_id
  const displayName = comment.author?.name || comment.author?.email || "Unknown"
  const initials = displayName.slice(0, 2).toUpperCase()
  const canReply = canEdit && !isReply

  const content = (
    <div className={cn("flex gap-3", isReply && "ml-8 mt-3")}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={(comment.author as any)?.image} />
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
            users={users}
          />
        </div>
        {canEdit && !isReply && (
          <div className="flex items-center gap-1 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onReply(comment.id)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          </div>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <RepliesBlock
            replies={comment.replies}
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

  if (canReply && onHoverChange) {
    return (
      <div
        className={cn(
          "rounded-lg transition-colors -mx-2 px-2 py-1 -my-0.5",
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
  users,
  initialMentionIds = [],
}: {
  placeholder?: string
  onSubmit: (body: string, mentionUserIds: string[]) => Promise<{ body: string; parent_id?: string; mention_user_ids?: string[] }>
  onCancel?: () => void
  users: { id: string; name: string | null; email: string }[]
  initialMentionIds?: string[]
}) {
  const [body, setBody] = useState("")
  const [mentionUserIds, setMentionUserIds] = useState<string[]>(initialMentionIds)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [inlineMention, setInlineMention] = useState<{ query: string; start: number; cursor: number } | null>(null)
  const [mentionHighlightIndex, setMentionHighlightIndex] = useState(0)
  const [mentionListPosition, setMentionListPosition] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionListRef = useRef<HTMLDivElement>(null)
  const isMac = useIsMac()
  const sendShortcut = isMac ? "⌘+Enter" : "Ctrl+Enter"
  const sendShortcutKbd = isMac ? "⌘↵" : "Ctrl+↵"
  const DROPDOWN_MAX_HEIGHT = 280
  const DROPDOWN_WIDTH = 280

  useLayoutEffect(() => {
    if (!inlineMention || !textareaRef.current) {
      setMentionListPosition(null)
      return
    }
    const el = textareaRef.current
    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < Math.min(DROPDOWN_MAX_HEIGHT + 8, 200) && rect.top > spaceBelow
    setMentionListPosition({
      top: openUp ? rect.top : rect.bottom + 4,
      left: rect.left,
      width: Math.min(Math.max(rect.width, 200), DROPDOWN_WIDTH),
      openUp,
    })
  }, [inlineMention])

  const getFilteredUsers = (query: string) => {
    const q = query.trim().toLowerCase()
    return users
      .filter((u) => !mentionUserIds.includes(u.id))
      .filter((u) => {
        if (!q) return true
        const name = (u.name || "").toLowerCase()
        const email = (u.email || "").toLowerCase()
        return name.includes(q) || email.includes(q)
      })
  }

  const addMention = (user: { id: string; name: string | null; email: string }, replaceInline = false) => {
    if (mentionUserIds.includes(user.id) && !replaceInline) return
    const name = user.name || user.email
    if (replaceInline && inlineMention) {
      const before = body.slice(0, inlineMention.start)
      const after = body.slice(inlineMention.cursor)
      const newBody = before + `@${name} ` + after
      setBody(newBody)
      setMentionUserIds((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]))
      setInlineMention(null)
      setMentionHighlightIndex(0)
      setTimeout(() => {
        textareaRef.current?.focus()
        const pos = inlineMention.start + name.length + 2
        textareaRef.current?.setSelectionRange(pos, pos)
      }, 0)
    } else {
      setMentionUserIds((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]))
      setBody((prev) => prev + `@${name} `)
      setMentionOpen(false)
      textareaRef.current?.focus()
    }
  }

  const removeMention = (userId: string) => {
    setMentionUserIds((prev) => prev.filter((id) => id !== userId))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursor = e.target.selectionStart ?? value.length
    setBody(value)
    const textBeforeCursor = value.slice(0, cursor)
    const lastAt = textBeforeCursor.lastIndexOf("@")
    if (lastAt >= 0) {
      const query = textBeforeCursor.slice(lastAt + 1)
      if (!query.includes(" ")) {
        setInlineMention({ query, start: lastAt, cursor })
        setMentionHighlightIndex(0)
      } else {
        setInlineMention(null)
      }
    } else {
      setInlineMention(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
      return
    }
    const filtered = inlineMention ? getFilteredUsers(inlineMention.query) : []
    if (inlineMention && filtered.length > 0) {
      if (e.key === "Escape") {
        e.preventDefault()
        setInlineMention(null)
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMentionHighlightIndex((i) => (i + 1) % filtered.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setMentionHighlightIndex((i) => (i - 1 + filtered.length) % filtered.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        addMention(filtered[mentionHighlightIndex], true)
        return
      }
    }
  }

  const handleSubmit = async () => {
    const trimmed = body.trim()
    if (!trimmed) return
    setSubmitting(true)
    setInlineMention(null)
    try {
      const payload = await onSubmit(trimmed, mentionUserIds)
      setBody("")
      setMentionUserIds([])
      onCancel?.()
    } finally {
      setSubmitting(false)
    }
  }

  const filteredInlineUsers = inlineMention ? getFilteredUsers(inlineMention.query) : []

  useEffect(() => {
    if (!mentionListRef.current || filteredInlineUsers.length === 0) return
    const highlighted = mentionListRef.current.querySelector(`[data-mention-index="${mentionHighlightIndex}"]`)
    highlighted?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [mentionHighlightIndex, filteredInlineUsers.length])

  const mentionDropdown =
    typeof document !== "undefined" &&
    inlineMention != null &&
    mentionListPosition != null
      ? createPortal(
          <div
            ref={mentionListRef}
            className="rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden"
            style={{
              position: "fixed",
              left: mentionListPosition.left,
              width: mentionListPosition.width,
              ...(mentionListPosition.openUp
                ? { bottom: window.innerHeight - mentionListPosition.top + 4 }
                : { top: mentionListPosition.top }),
              zIndex: 9999,
              maxHeight: DROPDOWN_MAX_HEIGHT,
            }}
          >
            <div className="overflow-y-auto py-1" style={{ maxHeight: DROPDOWN_MAX_HEIGHT - 8 }}>
              {filteredInlineUsers.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">No matching users</p>
              ) : (
                filteredInlineUsers.map((user, i) => (
                  <button
                    key={user.id}
                    type="button"
                    data-mention-index={i}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                      i === mentionHighlightIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    )}
                    onClick={() => addMention(user, true)}
                    onMouseEnter={() => setMentionHighlightIndex(i)}
                  >
                    <span className="font-medium truncate">{user.name || user.email}</span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <div className="space-y-2 mt-2 relative">
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={body}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="min-h-[80px] resize-none"
        disabled={submitting}
      />
      {mentionDropdown}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8">
                <AtSign className="h-3.5 w-3.5 mr-1" />
                Mention
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="max-h-56 overflow-y-auto">
                {users
                  .filter((u) => !mentionUserIds.includes(u.id))
                  .map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      onClick={() => addMention(user)}
                    >
                      <span className="font-medium">
                        {user.name || user.email}
                      </span>
                    </button>
                  ))}
                {users.filter((u) => !mentionUserIds.includes(u.id)).length === 0 && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    All members mentioned
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {mentionUserIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {mentionUserIds.map((id) => {
                const u = users.find((x) => x.id === id)
                if (!u) return null
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
                  >
                    {u.name || u.email}
                    <button
                      type="button"
                      className="hover:bg-muted-foreground/20 rounded p-0.5"
                      onClick={() => removeMention(id)}
                      aria-label="Remove mention"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!body.trim() || submitting}
            title={`Send (${sendShortcut})`}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{submitting ? "Sending..." : "Send"}</span>
            <kbd className="ml-0.5 hidden sm:inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border/60 bg-muted/80 px-1 font-mono text-[10px] text-muted-foreground">
              {sendShortcutKbd}
            </kbd>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TicketComments({ ticketId, displayId }: TicketCommentsProps) {
  const { data: session } = useSession()
  const { flags } = usePermissions()
  const { data: usersData } = useUsers()
  const users = usersData || []
  const currentUserId = users.find((u) => u.email === session?.user?.email)?.id ?? null
  const canEdit = flags?.canEditTickets ?? false

  const {
    comments,
    isLoading,
    error,
    addComment,
    updateComment,
    deleteComment,
  } = useTicketComments(ticketId, { enabled: !!ticketId })

  const { markTicketRead } = useCommentNotifications()

  useEffect(() => {
    if (ticketId) markTicketRead.mutate(ticketId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]) // markTicketRead is stable from React Query, no need to include

  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<TicketComment | null>(null)
  const [editBody, setEditBody] = useState("")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "r" && e.key !== "R") return
      const target = e.target as HTMLElement | null
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable
      if (isInput) return
      if (!hoveredCommentId) return
      e.preventDefault()
      setReplyingToId(hoveredCommentId)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [hoveredCommentId])

  const handleReply = (parentId: string) => {
    setReplyingToId(parentId)
  }

  const handleSubmitReply = (parentId: string) => {
    return async (body: string, mentionUserIds: string[]) => {
      await addComment.mutateAsync({
        body,
        parent_id: parentId,
        mention_user_ids: mentionUserIds,
      })
      setReplyingToId(null)
      return { body, parent_id: parentId, mention_user_ids: mentionUserIds }
    }
  }

  const handleStartEdit = (comment: TicketComment) => {
    setEditingComment(comment)
    setEditBody(comment.body)
  }

  const handleSaveEdit = async () => {
    if (!editingComment) return
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

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Failed to load comments.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
          {comments.length > 0 && (
            <span className="text-muted-foreground font-normal text-sm">
              ({comments.length} root)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        ) : (
          <>
            {comments.length === 0 && !replyingToId ? (
              <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id}>
                    {editingComment?.id === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit}>
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
                      <div className="ml-8 mt-2">
                        <CommentComposer
                          placeholder="Write a reply..."
                          onSubmit={handleSubmitReply(comment.id)}
                          onCancel={() => setReplyingToId(null)}
                          users={users}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canEdit && (
              <div className="pt-2 border-t">
                <CommentComposer
                  placeholder="Add a comment..."
                  onSubmit={async (body, mentionUserIds) => {
                    await addComment.mutateAsync({
                      body,
                      mention_user_ids: mentionUserIds,
                    })
                    return { body, mention_user_ids: mentionUserIds }
                  }}
                  users={users}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
