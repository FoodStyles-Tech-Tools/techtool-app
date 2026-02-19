"use client"

import { useEffect, useState, type ReactNode } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Table as TableIcon,
  Palette,
  Image as ImageIcon,
  Type,
} from "lucide-react"
import { cn } from "@/lib/utils"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textColor: {
      setTextColor: (color: string) => ReturnType
      unsetTextColor: () => ReturnType
    }
    imageBlock: {
      setImageBlock: (options: { src: string; alt?: string; title?: string }) => ReturnType
    }
    mentionBadge: {
      insertMentionBadge: (options: {
        mentionType: "user" | "ticket"
        label: string
        href?: string | null
        ticketStatus?: string | null
      }) => ReturnType
    }
  }
}

const TextColor = Mark.create({
  name: "textColor",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.color || null,
        renderHTML: (attributes) =>
          attributes.color ? { style: `color: ${attributes.color}` } : {},
      },
    }
  },
  parseHTML() {
    return [{ style: "color" }]
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0]
  },
  addCommands() {
    return {
      setTextColor:
        (color: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetTextColor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },
})

const ImageBlock = Node.create({
  name: "imageBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    }
  },
  parseHTML() {
    return [{ tag: "img[src]" }]
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes({ loading: "lazy" }, HTMLAttributes)]
  },
  addCommands() {
    return {
      setImageBlock:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    }
  },
})

const MentionBadge = Node.create({
  name: "mentionBadge",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,
  addAttributes() {
    return {
      mentionType: {
        default: "user",
        parseHTML: (element) => element.getAttribute("data-mention-type") || "user",
        renderHTML: (attributes) => ({
          "data-mention-type": attributes.mentionType || "user",
        }),
      },
      label: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-mention-label") || element.textContent || "",
        renderHTML: (attributes) =>
          attributes.label ? { "data-mention-label": attributes.label } : {},
      },
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: (attributes) =>
          attributes.mentionType === "ticket" && attributes.href
            ? { href: attributes.href }
            : {},
      },
      ticketStatus: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-ticket-status"),
        renderHTML: (attributes) =>
          attributes.mentionType === "ticket" && attributes.ticketStatus
            ? { "data-ticket-status": attributes.ticketStatus }
            : {},
      },
    }
  },
  parseHTML() {
    return [{ tag: "span[data-mention-badge]" }, { tag: "a[data-mention-badge]" }]
  },
  renderHTML({ node, HTMLAttributes }) {
    const mentionType = node.attrs.mentionType === "ticket" ? "ticket" : "user"
    const className = mentionType === "ticket" ? "mention-pill mention-ticket" : "mention-pill"
    const statusLabel =
      mentionType === "ticket" && typeof node.attrs.ticketStatus === "string"
        ? node.attrs.ticketStatus
            .replace(/_/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase()
        : ""
    const attrs = mergeAttributes(
      {
        "data-mention-badge": "true",
        class: className,
      },
      HTMLAttributes
    )

    if (mentionType === "ticket" && node.attrs.href) {
      return [
        "a",
        attrs,
        ["span", { class: "mention-ticket-label" }, node.attrs.label || ""],
        ...(statusLabel ? [["span", { class: "mention-ticket-status" }, statusLabel]] : []),
      ]
    }
    return ["span", attrs, node.attrs.label || ""]
  },
  renderText({ node }) {
    return node.attrs.label || ""
  },
  addCommands() {
    return {
      insertMentionBadge:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              mentionType: options.mentionType,
              label: options.label,
              href: options.href ?? null,
              ticketStatus: options.ticketStatus ?? null,
            },
          }),
    }
  },
})

const MentionDecoration = Extension.create({
  name: "mentionDecorationHelper",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("mention-decoration-helper"),
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return
              const text = node.text
              const ticketRegex = /\b([A-Z]{2,}-\d+)\b/g
              let match: RegExpExecArray | null
              while ((match = ticketRegex.exec(text)) !== null) {
                const from = pos + match.index
                const to = from + match[0].length
                decorations.push(
                  Decoration.inline(from, to, {
                    class: "mention-pill mention-ticket",
                  })
                )
              }
            })
            return decorations.length > 0 ? DecorationSet.create(state.doc, decorations) : null
          },
        },
      }),
    ]
  },
})

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  compact?: boolean
  /** Hide toolbar until editor is focused/clicked. */
  showToolbarOnFocus?: boolean
  /** Show only a placeholder box until clicked. */
  activateOnClick?: boolean
  /** Optional footer rendered inside the editor box (below content). */
  footer?: ReactNode
  /** Optional inline panel rendered between toolbar and content (e.g. mentions menu). */
  inlinePanel?: ReactNode
  /** Enable inline ticket badge decoration while typing. */
  decorateMentions?: boolean
  /** Provides editor instance to parent for imperative commands. */
  onEditorReady?: (editor: unknown | null) => void
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write a description...",
  className,
  compact = false,
  showToolbarOnFocus = true,
  activateOnClick = false,
  footer,
  inlinePanel,
  decorateMentions = false,
  onEditorReady,
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isActivated, setIsActivated] = useState(() => !activateOnClick || Boolean(value?.trim()))
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Underline,
      TextColor,
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      ImageBlock,
      MentionBadge,
      ...(decorateMentions ? [MentionDecoration] : []),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: compact ? "tiptap tiptap-compact" : "tiptap",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) return
    const onFocus = () => setIsFocused(true)
    const onBlur = () => setIsFocused(false)
    editor.on("focus", onFocus)
    editor.on("blur", onBlur)
    return () => {
      editor.off("focus", onFocus)
      editor.off("blur", onBlur)
    }
  }, [editor])

  useEffect(() => {
    if (!onEditorReady) return
    onEditorReady(editor)
    return () => onEditorReady(null)
  }, [editor, onEditorReady])

  useEffect(() => {
    if (!activateOnClick) return
    const hasValue = Boolean(value?.trim())
    if (!isFocused && !hasValue) {
      setIsActivated(false)
    } else if (hasValue) {
      setIsActivated(true)
    }
  }, [activateOnClick, isFocused, value])

  const activateEditor = () => {
    setIsActivated(true)
    requestAnimationFrame(() => {
      editor?.chain().focus().run()
    })
  }

  const toggleLink = () => {
    if (!editor) return
    const previousUrl = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Enter URL", previousUrl || "")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  const setColor = () => {
    if (!editor) return
    editor.chain().focus().unsetTextColor().run()
  }

  const insertImage = () => {
    if (!editor) return
    const src = window.prompt("Image URL")
    if (!src || !src.trim()) return
    const alt = window.prompt("Alt text (optional)") || undefined
    editor
      .chain()
      .focus()
      .setImageBlock({ src: src.trim(), alt })
      .run()
  }

  const activeTextColor = (editor?.getAttributes("textColor")?.color as string | undefined) || null
  const colorPickerValue =
    typeof activeTextColor === "string" && /^#[0-9a-f]{6}$/i.test(activeTextColor)
      ? activeTextColor
      : "#2563eb"
  const showToolbar = !showToolbarOnFocus || isFocused

  if (activateOnClick && !isActivated) {
    return (
      <button
        type="button"
        onClick={activateEditor}
        className={cn(
          "w-full rounded-md border bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40",
          compact ? "min-h-[44px]" : "min-h-[56px]",
          className
        )}
      >
        {placeholder}
      </button>
    )
  }

  return (
    <div
      className={cn("rounded-md border bg-background", className)}
      onClick={() => editor?.chain().focus().run()}
    >
      {showToolbar && (
      <div className="flex flex-wrap gap-1 border-b p-2">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-2 py-1 text-xs transition-colors",
            editor?.isActive("bold") ? "selected-ui" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-2 py-1 text-xs transition-colors",
            editor?.isActive("italic") ? "selected-ui" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-2 py-1 text-xs transition-colors",
            editor?.isActive("underline") ? "selected-ui" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-2 py-1 text-xs transition-colors",
            editor?.isActive("strike") ? "selected-ui" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-1.5 py-1 text-[11px] font-semibold transition-colors",
            editor?.isActive("heading", { level: 1 })
              ? "selected-ui"
              : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-1.5 py-1 text-[11px] font-semibold transition-colors",
            editor?.isActive("heading", { level: 2 })
              ? "selected-ui"
              : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-1.5 py-1 text-[11px] font-semibold transition-colors",
            editor?.isActive("heading", { level: 3 })
              ? "selected-ui"
              : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-2 py-1 text-xs transition-colors",
            editor?.isActive("bulletList") ? "selected-ui" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-2 py-1 text-xs transition-colors",
            editor?.isActive("orderedList") ? "selected-ui" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-2 py-1 text-xs transition-colors",
            editor?.isActive("blockquote") ? "selected-ui" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-2 py-1 text-xs transition-colors",
            editor?.isActive("code") ? "selected-ui" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <Code className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-2 py-1 text-xs transition-colors",
            editor?.isActive("link") ? "selected-ui" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={toggleLink}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "rounded-md border border-transparent px-2 py-1 text-xs transition-colors",
            editor?.isActive("textColor") ? "selected-ui" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={setColor}
          title="Clear text color"
        >
          <Type className="h-3.5 w-3.5" />
        </button>
        <label
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "relative inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-transparent transition-colors",
            editor?.isActive("textColor") ? "selected-ui" : "text-muted-foreground hover:bg-accent"
          )}
          title="Pick text color"
        >
          <Palette className="h-3.5 w-3.5" />
          <span
            className="absolute bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full border border-border/40"
            style={{ backgroundColor: activeTextColor || "transparent" }}
          />
          <input
            type="color"
            value={colorPickerValue}
            onChange={(event) => editor?.chain().focus().setTextColor(event.target.value).run()}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Pick text color"
          />
        </label>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className="rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
          onClick={insertImage}
          title="Insert image"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
          onClick={() =>
            editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <TableIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      )}
      {inlinePanel ? <div className="px-2 pt-1">{inlinePanel}</div> : null}
      <EditorContent editor={editor} />
      {footer ? <div className="border-t px-3 py-2">{footer}</div> : null}
    </div>
  )
}
