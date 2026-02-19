"use client"

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import type { Editor } from "@tiptap/core"
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
import { useTickets } from "@/hooks/use-tickets"
import { useUsers } from "@/hooks/use-users"
import { useSession } from "@/lib/auth-client"
import { usePermissions } from "@/hooks/use-permissions"
import { toast } from "@/components/ui/toast"
import { MessageSquare, Reply, Pencil, Trash2, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSanitizedHtmlProps } from "@/lib/sanitize-html"
import { isRichTextEmpty, normalizeRichTextInput, richTextToPlainText, toDisplayHtml } from "@/lib/rich-text"

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

type TicketBadgeInfo = { displayId: string; status: string }
type TicketInfoBySlug = Record<string, TicketBadgeInfo>

const TICKET_URL_REGEX = /https?:\/\/techtool-app\.vercel\.app\/tickets\/([a-z]{2,}-\d+)\b/gi

function formatTicketStatusLabel(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
}

function escapeHtmlValue(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderTicketBadgeHtml(slug: string, info: TicketBadgeInfo) {
  const safeSlug = escapeHtmlValue(slug)
  const safeLabel = escapeHtmlValue(info.displayId)
  const statusLabel = formatTicketStatusLabel(info.status)
  const safeStatusLabel = escapeHtmlValue(statusLabel)
  const safeStatusValue = escapeHtmlValue(info.status)

  return `<a data-mention-badge="true" data-mention-type="ticket" data-mention-label="${safeLabel}" data-ticket-status="${safeStatusValue}" class="mention-pill mention-ticket" href="/tickets/${safeSlug}"><span class="mention-ticket-label">${safeLabel}</span><span class="mention-ticket-status">${safeStatusLabel}</span></a>`
}

const CommentBody = memo(function CommentBody({
  body,
  mentions,
  ticketInfoBySlug,
}: {
  body: string
  mentions: { user_id: string; user?: { id: string; name: string | null; email: string } }[]
  ticketInfoBySlug: TicketInfoBySlug
}) {
  const mentionLabelMap = new Map<string, string>()
  mentions.forEach((mention) => {
    const label = mention.user?.name || mention.user?.email
    if (label) mentionLabelMap.set(mention.user_id, label)
  })

  let html = toDisplayHtml(body) ?? ""
  if (!/data-mention-badge\s*=/.test(html)) {
    mentionLabelMap.forEach((label) => {
      const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const mentionRegex = new RegExp(`@${safeLabel}`, "gi")
      html = html.replace(
        mentionRegex,
        `<span class="mention-pill">@${label}</span>`
      )
    })

    const linkedTicketRegex =
      /<a\b[^>]*href=(["'])https?:\/\/techtool-app\.vercel\.app\/tickets\/([a-z]{2,}-\d+)\1[^>]*>[\s\S]*?<\/a>/gi

    html = html.replace(linkedTicketRegex, (fullMatch, _quote, matchedSlug: string) => {
      const slug = String(matchedSlug || "").toLowerCase()
      const info = ticketInfoBySlug[slug]
      if (!info?.displayId || !info?.status) return fullMatch
      return renderTicketBadgeHtml(slug, info)
    })

    const plainTicketRegex = new RegExp(TICKET_URL_REGEX.source, TICKET_URL_REGEX.flags)
    html = html
      .split(/(<[^>]+>)/g)
      .map((part) => {
        if (!part || part.startsWith("<")) return part
        return part.replace(plainTicketRegex, (fullMatch, matchedSlug: string) => {
          const slug = String(matchedSlug || "").toLowerCase()
          const info = ticketInfoBySlug[slug]
          if (!info?.displayId || !info?.status) return fullMatch
          return renderTicketBadgeHtml(slug, info)
        })
      })
      .join("")
  }

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
  ticketInfoBySlug,
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
  ticketInfoBySlug: TicketInfoBySlug
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
                ticketInfoBySlug={ticketInfoBySlug}
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
  ticketInfoBySlug,
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
  ticketInfoBySlug: TicketInfoBySlug
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
            ticketInfoBySlug={ticketInfoBySlug}
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
            ticketInfoBySlug={ticketInfoBySlug}
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
  seedInitialMentionAsBadge = false,
  users,
  tickets,
}: {
  placeholder?: string
  onSubmit: (body: string, mentionUserIds: string[]) => Promise<{ body: string; parent_id?: string; mention_user_ids?: string[] }>
  onCancel?: () => void
  initialBody?: string
  initialMentionIds?: string[]
  seedInitialMentionAsBadge?: boolean
  users: { id: string; name: string | null; email: string; image?: string | null }[]
  tickets: { id: string; display_id: string | null; title: string; status: string }[]
}) {
  const [body, setBody] = useState(initialBody)
  const [mentionUserIds, setMentionUserIds] = useState<string[]>(initialMentionIds)
  const [submitting, setSubmitting] = useState(false)
  const [pickerMode, setPickerMode] = useState<"user" | null>(null)
  const [pickerQuery, setPickerQuery] = useState("")
  const [editor, setEditor] = useState<Editor | null>(null)
  const [didSeedInitialBadge, setDidSeedInitialBadge] = useState(false)
  const [resolvedTicketBySlug, setResolvedTicketBySlug] = useState<Record<string, { displayId: string; status: string }>>({})
  const ticketLookupInFlightRef = useRef<Set<string>>(new Set())

  const bodyText = richTextToPlainText(body)

  const handleEditorReady = useCallback((instance: unknown | null) => {
    const nextEditor = (instance as Editor | null) ?? null
    setEditor((prev) => (prev === nextEditor ? prev : nextEditor))
  }, [])

  useEffect(() => {
    const mentionUserMatch = bodyText.match(/(?:^|\s)@([a-z0-9._-]*)$/i)
    if (mentionUserMatch) {
      setPickerMode("user")
      setPickerQuery((mentionUserMatch[1] || "").toLowerCase())
      return
    }

    if (pickerMode) {
      setPickerMode(null)
      setPickerQuery("")
    }
  }, [bodyText, pickerMode])

  useEffect(() => {
    if (!editor) return

    const ticketBySlug = new Map<string, { displayId: string; status: string }>()
    tickets.forEach((ticket) => {
      if (!ticket.display_id) return
      ticketBySlug.set(String(ticket.display_id).toLowerCase(), {
        displayId: String(ticket.display_id).toUpperCase(),
        status: ticket.status,
      })
    })
    Object.entries(resolvedTicketBySlug).forEach(([slug, info]) => {
      if (!ticketBySlug.has(slug)) {
        ticketBySlug.set(slug, info)
      }
    })

    const replacements: Array<{
      from: number
      to: number
      slug: string
      displayId: string
      status: string
    }> = []

    editor.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return
      const text = node.text
      const urlRegex = new RegExp(TICKET_URL_REGEX.source, TICKET_URL_REGEX.flags)
      let match: RegExpExecArray | null
      while ((match = urlRegex.exec(text)) !== null) {
        const slug = (match[1] || "").toLowerCase()
        const ticket = ticketBySlug.get(slug)
        if (!ticket) continue
        const from = pos + match.index
        const to = from + match[0].length
        replacements.push({
          from,
          to,
          slug,
          displayId: ticket.displayId,
          status: ticket.status,
        })
      }
    })

    if (replacements.length === 0) return

    const chain = editor.chain().focus()
    for (let index = replacements.length - 1; index >= 0; index -= 1) {
      const replacement = replacements[index]
      chain
        .deleteRange({ from: replacement.from, to: replacement.to })
        .insertMentionBadge({
          mentionType: "ticket",
          label: replacement.displayId,
          href: `/tickets/${replacement.slug}`,
          ticketStatus: replacement.status,
        })
        .insertContent(" ")
    }
    chain.run()
  }, [editor, bodyText, tickets, resolvedTicketBySlug])

  useEffect(() => {
    const localTicketBySlug = new Map(
      tickets
        .filter((ticket) => Boolean(ticket.display_id))
        .map((ticket) => [String(ticket.display_id).toLowerCase(), ticket] as const)
    )
    const slugsInBody = Array.from(
      new Set(
        Array.from(bodyText.matchAll(new RegExp(TICKET_URL_REGEX.source, TICKET_URL_REGEX.flags))).map((match) =>
          String(match[1] || "").toLowerCase()
        )
      )
    ).filter(Boolean)

    const slugsToFetch = slugsInBody.filter((slug) => {
      if (localTicketBySlug.has(slug)) return false
      if (resolvedTicketBySlug[slug]) return false
      if (ticketLookupInFlightRef.current.has(slug)) return false
      return true
    })

    if (slugsToFetch.length === 0) return

    slugsToFetch.forEach((slug) => {
      ticketLookupInFlightRef.current.add(slug)
      fetch(`/api/tickets/by-display-id/${encodeURIComponent(slug)}`)
        .then(async (response) => {
          if (!response.ok) return null
          const payload = await response.json().catch(() => null)
          const ticket = payload?.ticket as { display_id?: string | null; status?: string | null } | undefined
          if (!ticket?.display_id || !ticket?.status) return null
          return {
            slug,
            displayId: String(ticket.display_id).toUpperCase(),
            status: String(ticket.status),
          }
        })
        .then((resolved) => {
          if (!resolved) return
          setResolvedTicketBySlug((prev) => {
            if (prev[resolved.slug]) return prev
            return {
              ...prev,
              [resolved.slug]: {
                displayId: resolved.displayId,
                status: resolved.status,
              },
            }
          })
        })
        .finally(() => {
          ticketLookupInFlightRef.current.delete(slug)
        })
    })
  }, [bodyText, tickets, resolvedTicketBySlug])

  useEffect(() => {
    if (!seedInitialMentionAsBadge || didSeedInitialBadge || !editor) return
    if (initialMentionIds.length === 0) {
      setDidSeedInitialBadge(true)
      return
    }

    const firstMentionId = initialMentionIds[0]
    const user = users.find((candidate) => candidate.id === firstMentionId)
    if (!user) {
      setDidSeedInitialBadge(true)
      return
    }

    const label = user.name || user.email
    const expectedTextMention = `@${label}`.toLowerCase()
    const plain = richTextToPlainText(body).toLowerCase()
    if (!plain.includes(expectedTextMention)) {
      setDidSeedInitialBadge(true)
      return
    }

    editor
      .chain()
      .focus()
      .setContent("")
      .insertMentionBadge({
        mentionType: "user",
        label: `@${label}`,
      })
      .insertContent(" ")
      .run()

    setDidSeedInitialBadge(true)
  }, [
    seedInitialMentionAsBadge,
    didSeedInitialBadge,
    editor,
    initialMentionIds,
    users,
    body,
  ])

  const setBodyFromPlainText = (value: string) => {
    setBody(normalizeRichTextInput(value) ?? "")
  }

  const replaceTrailingUserTriggerToken = (token: string) => {
    const currentText = richTextToPlainText(body)
    const regex = /(?:^|\s)@[a-z0-9._-]*$/i
    const prefixedToken = `@${token}`
    let replaced = false
    const nextText = currentText.replace(regex, (match) => {
      replaced = true
      const hasLeadingSpace = match.startsWith(" ")
      return `${hasLeadingSpace ? " " : ""}${prefixedToken}`
    })

    const fallbackText = replaced
      ? nextText
      : `${currentText.trimEnd()} ${prefixedToken}`.trimStart()

    setBodyFromPlainText(`${fallbackText} `)
  }

  const filteredUsers = users
    .filter((user) => {
      const q = pickerQuery.trim().toLowerCase()
      if (!q) return true
      return (
        (user.name || "").toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      )
    })
    .slice(0, 8)

  const insertMentionFromPicker = ({
    label,
  }: {
    label: string
  }) => {
    if (!editor) {
      replaceTrailingUserTriggerToken(label.replace(/^@/, ""))
      return
    }

    const selectionFrom = editor.state.selection.from
    const queryLength = pickerQuery.length + 1
    const deleteFrom = Math.max(selectionFrom - queryLength, 1)
    const mentionLabel = `@${label.replace(/^@/, "")}`

    editor
      .chain()
      .focus()
      .deleteRange({ from: deleteFrom, to: selectionFrom })
      .insertMentionBadge({
        mentionType: "user",
        label: mentionLabel,
      })
      .insertContent(" ")
      .run()
  }

  const handleSubmit = async () => {
    if (isRichTextEmpty(body)) return
    setSubmitting(true)
    try {
      const ensureUrlsConverted = async () => {
        if (!editor) return body

        const localTicketBySlug = new Map(
          tickets
            .filter((ticket) => Boolean(ticket.display_id))
            .map((ticket) => [
              String(ticket.display_id).toLowerCase(),
              { displayId: String(ticket.display_id).toUpperCase(), status: ticket.status },
            ] as const)
        )

        const resolveInfo = async (slug: string): Promise<{ displayId: string; status: string } | null> => {
          if (localTicketBySlug.has(slug)) return localTicketBySlug.get(slug) || null
          if (resolvedTicketBySlug[slug]) return resolvedTicketBySlug[slug]
          const response = await fetch(`/api/tickets/by-display-id/${encodeURIComponent(slug)}`)
          if (!response.ok) return null
          const payload = await response.json().catch(() => null)
          const ticket = payload?.ticket as { display_id?: string | null; status?: string | null } | undefined
          if (!ticket?.display_id || !ticket?.status) return null
          const info = {
            displayId: String(ticket.display_id).toUpperCase(),
            status: String(ticket.status),
          }
          setResolvedTicketBySlug((prev) => ({
            ...prev,
            [slug]: info,
          }))
          return info
        }

        const replacements: Array<{ from: number; to: number; slug: string; info: { displayId: string; status: string } }> = []
        editor.state.doc.descendants((node, pos) => {
          if (!node.isText || !node.text) return
          const text = node.text
          const urlRegex = new RegExp(TICKET_URL_REGEX.source, TICKET_URL_REGEX.flags)
          let match: RegExpExecArray | null
          while ((match = urlRegex.exec(text)) !== null) {
            const slug = String(match[1] || "").toLowerCase()
            const from = pos + match.index
            const to = from + match[0].length
            replacements.push({ from, to, slug, info: { displayId: "", status: "" } })
          }
        })

        if (replacements.length === 0) return editor.getHTML()

        for (const replacement of replacements) {
          const info = await resolveInfo(replacement.slug)
          if (info) replacement.info = info
        }

        const convertibles = replacements.filter((replacement) => replacement.info.displayId && replacement.info.status)
        if (convertibles.length === 0) return editor.getHTML()

        const chain = editor.chain().focus()
        for (let index = convertibles.length - 1; index >= 0; index -= 1) {
          const replacement = convertibles[index]
          chain
            .deleteRange({ from: replacement.from, to: replacement.to })
            .insertMentionBadge({
              mentionType: "ticket",
              label: replacement.info.displayId,
              href: `/tickets/${replacement.slug}`,
              ticketStatus: replacement.info.status,
            })
            .insertContent(" ")
        }
        chain.run()
        return editor.getHTML()
      }

      const value = (await ensureUrlsConverted()).trim()
      const normalizedBodyText = richTextToPlainText(value).toLowerCase()
      const mentionUserIdsToSubmit = mentionUserIds.filter((userId) => {
        const user = users.find((candidate) => candidate.id === userId)
        if (!user) return false
        const label = (user.name || user.email).toLowerCase()
        return normalizedBodyText.includes(`@${label}`)
      })
      await onSubmit(value, mentionUserIdsToSubmit)
      setBody("")
      setMentionUserIds(initialMentionIds)
      setPickerMode(null)
      setPickerQuery("")
      onCancel?.()
    } finally {
      setSubmitting(false)
    }
  }

  const handleComposerKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault()
      if (!submitting && !isRichTextEmpty(body)) {
        void handleSubmit()
      }
      return true
    }
    return false
  }

  const hasText = !isRichTextEmpty(body)
  const showSend = hasText || submitting
  const showActions = Boolean(onCancel) || showSend
  const mentionInlinePanel =
    pickerMode === "user" ? (
      <div
        className="w-full max-w-[420px] overflow-hidden rounded-md border border-border/80 bg-popover shadow-xl"
        onMouseDown={(event) => event.preventDefault()}
      >
        <div className="max-h-56 overflow-y-auto py-1">
          {filteredUsers.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No users found</p>
          ) : (
            filteredUsers.map((user) => {
              const label = user.name || user.email
              const initials = label
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() || "")
                .join("") || "U"
              return (
                <button
                  key={user.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    insertMentionFromPicker({ label })
                    setMentionUserIds((prev) => Array.from(new Set([...prev, user.id])))
                    setPickerMode(null)
                    setPickerQuery("")
                  }}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{label}</div>
                    {user.name ? (
                      <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    ) : null}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    ) : null

  return (
    <div className="space-y-2 mt-1.5 relative">
      <RichTextEditor
        value={body}
        onChange={setBody}
        placeholder={placeholder}
        className="border-border/50"
        compact
        activateOnClick
        inlinePanel={mentionInlinePanel}
        onContentKeyDown={handleComposerKeyDown}
        onEditorReady={handleEditorReady}
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
  const canEdit = flags?.canEditTickets ?? false
  const { data: usersData } = useUsers()
  const users = usersData || []
  const { data: mentionTicketsData } = useTickets({
    enabled: canEdit,
    realtime: false,
    limit: 200,
    page: 1,
  })
  const mentionTickets = (mentionTicketsData || []).map((ticket) => ({
    id: ticket.id,
    display_id: ticket.display_id,
    title: ticket.title,
    status: ticket.status,
  }))
  if (displayId && !mentionTickets.some((ticket) => (ticket.display_id || "").toLowerCase() === displayId.toLowerCase())) {
    mentionTickets.unshift({
      id: ticketId,
      display_id: displayId,
      title: "Current ticket",
      status: "",
    })
  }
  const currentUserId = users.find((u) => u.email === session?.user?.email)?.id ?? null

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
  const [resolvedCommentTicketsBySlug, setResolvedCommentTicketsBySlug] = useState<TicketInfoBySlug>({})
  const commentTicketLookupInFlightRef = useRef<Set<string>>(new Set())

  const ticketInfoBySlug = useMemo<TicketInfoBySlug>(() => {
    const infoBySlug: TicketInfoBySlug = {}
    mentionTickets.forEach((ticket) => {
      if (!ticket.display_id || !ticket.status) return
      infoBySlug[String(ticket.display_id).toLowerCase()] = {
        displayId: String(ticket.display_id).toUpperCase(),
        status: String(ticket.status),
      }
    })
    Object.entries(resolvedCommentTicketsBySlug).forEach(([slug, info]) => {
      if (!infoBySlug[slug]) {
        infoBySlug[slug] = info
      }
    })
    return infoBySlug
  }, [mentionTickets, resolvedCommentTicketsBySlug])

  const getReplyMentionSeed = (comment: TicketComment | undefined) => {
    if (!comment?.author_id) return null
    return {
      mentionUserId: comment.author_id,
      mentionLabel: comment.author?.name || comment.author?.email || "User",
    }
  }

  const findRootCommentById = (commentId: string) => comments.find((comment) => comment.id === commentId)

  useEffect(() => {
    const allBodies: string[] = []
    const collectBodies = (nodes: TicketComment[]) => {
      nodes.forEach((node) => {
        allBodies.push(node.body || "")
        if (node.replies?.length) collectBodies(node.replies)
      })
    }
    collectBodies(comments)

    const slugsInComments = new Set<string>()
    allBodies.forEach((commentBody) => {
      const html = toDisplayHtml(commentBody) ?? ""
      const matches = Array.from(html.matchAll(new RegExp(TICKET_URL_REGEX.source, TICKET_URL_REGEX.flags)))
      matches.forEach((match) => {
        const slug = String(match[1] || "").toLowerCase()
        if (slug) slugsInComments.add(slug)
      })
    })

    const slugsToFetch = Array.from(slugsInComments).filter((slug) => {
      if (ticketInfoBySlug[slug]) return false
      if (commentTicketLookupInFlightRef.current.has(slug)) return false
      return true
    })

    if (slugsToFetch.length === 0) return

    slugsToFetch.forEach((slug) => {
      commentTicketLookupInFlightRef.current.add(slug)
      fetch(`/api/tickets/by-display-id/${encodeURIComponent(slug)}`)
        .then(async (response) => {
          if (!response.ok) return null
          const payload = await response.json().catch(() => null)
          const ticket = payload?.ticket as { display_id?: string | null; status?: string | null } | undefined
          if (!ticket?.display_id || !ticket?.status) return null
          return {
            slug,
            displayId: String(ticket.display_id).toUpperCase(),
            status: String(ticket.status),
          }
        })
        .then((resolved) => {
          if (!resolved) return
          setResolvedCommentTicketsBySlug((prev) => {
            if (prev[resolved.slug]) return prev
            return {
              ...prev,
              [resolved.slug]: {
                displayId: resolved.displayId,
                status: resolved.status,
              },
            }
          })
        })
        .finally(() => {
          commentTicketLookupInFlightRef.current.delete(slug)
        })
    })
  }, [comments, ticketInfoBySlug])

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
        users={users}
        tickets={mentionTickets}
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
                        ticketInfoBySlug={ticketInfoBySlug}
                      />
                    )}
                    {replyingToId === comment.id && (
                      <div className="ml-[38px] pl-4 mt-1.5">
                        <CommentComposer
                          placeholder="Write a reply..."
                          users={users}
                          tickets={mentionTickets}
                          onSubmit={handleSubmitReply(comment.id)}
                          onCancel={() => {
                            setReplyingToId(null)
                            setReplyPrefill(null)
                          }}
                          initialBody={replyPrefill?.mentionLabel ? `@${replyPrefill.mentionLabel} ` : ""}
                          initialMentionIds={replyPrefill?.mentionUserId ? [replyPrefill.mentionUserId] : []}
                          seedInitialMentionAsBadge
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
