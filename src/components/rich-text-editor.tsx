"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
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
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  SquareCode,
  Link as LinkIcon,
  RemoveFormatting,
  Palette,
  ImageIcon,
  TableIcon,
} from "lucide-react"
import { cn } from "@client/lib/utils"

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

const TabIndentHandler = Extension.create({
  name: "tabIndentHandler",
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive("listItem")) {
          return editor.commands.sinkListItem("listItem")
        }
        if (editor.isActive("taskItem")) {
          return editor.commands.sinkListItem("taskItem")
        }
        return false
      },
      "Shift-Tab": ({ editor }) => {
        if (editor.isActive("listItem")) {
          return editor.commands.liftListItem("listItem")
        }
        if (editor.isActive("taskItem")) {
          return editor.commands.liftListItem("taskItem")
        }
        return false
      },
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
  minHeight?: number | string
  compact?: boolean
  /** Hide toolbar until editor is focused/clicked. */
  showToolbarOnFocus?: boolean
  /** Show only a placeholder box until clicked. */
  activateOnClick?: boolean
  /** When true, editor starts activated and focused (e.g. when parent just opened it for editing). */
  initialActivated?: boolean
  /** Optional footer rendered inside the editor box (below content). */
  footer?: ReactNode
  /** Optional inline panel rendered between toolbar and content (e.g. mentions menu). */
  inlinePanel?: ReactNode
  /** Optional low-level keydown handler for editor content. Return true to stop handling. */
  onContentKeyDown?: (event: KeyboardEvent) => boolean | void
  /** Enable inline ticket badge decoration while typing. */
  decorateMentions?: boolean
  /** Provides editor instance to parent for imperative commands. */
  onEditorReady?: (editor: unknown | null) => void
}

const toolbarButtonClassName =
  "inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent transition-colors"
const toolbarMutedButtonClassName = "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
const activeToolbarButtonClassName = "bg-blue-50 text-blue-600 border-blue-200"

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write a description...",
  className,
  minHeight,
  compact = false,
  showToolbarOnFocus = true,
  activateOnClick = false,
  initialActivated = false,
  footer,
  inlinePanel,
  onContentKeyDown,
  decorateMentions = false,
  onEditorReady,
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isActivated, setIsActivated] = useState(
    () => initialActivated || !activateOnClick || Boolean(value?.trim())
  )
  const onContentKeyDownRef = useRef<RichTextEditorProps["onContentKeyDown"]>(onContentKeyDown)

  useEffect(() => {
    onContentKeyDownRef.current = onContentKeyDown
  }, [onContentKeyDown])

  const resolvedMinHeight =
    minHeight == null ? undefined : typeof minHeight === "number" ? `${minHeight}px` : minHeight

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
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
      TaskList,
      TaskItem.configure({ nested: true }),
      TabIndentHandler,
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
      handleKeyDown: (_view, event) => {
        const handler = onContentKeyDownRef.current
        if (!handler) return false
        return Boolean(handler(event))
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  }, [])

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

  // When opening in "initial activated" mode, focus the editor once it's ready (defer so we run after dialog focus trap)
  useEffect(() => {
    if (!initialActivated || !editor || editor.isDestroyed) return
    const id = setTimeout(() => {
      if (editor.isDestroyed) return
      editor.chain().focus().run()
    }, 50)
    return () => clearTimeout(id)
  }, [initialActivated, editor])

  // When activateOnClick is true, collapse back to placeholder on blur if empty — but never when we were opened with initialActivated (single-click edit)
  const initialActivatedRef = useRef(initialActivated)
  useEffect(() => {
    initialActivatedRef.current = initialActivated
  }, [initialActivated])
  useEffect(() => {
    if (!activateOnClick || initialActivatedRef.current) return
    const hasValue = Boolean(value?.trim())
    if (!isFocused && !hasValue) {
      setIsActivated(false)
    } else if (hasValue) {
      setIsActivated(true)
    }
  }, [activateOnClick, isFocused, value])

  const focusEditorSafely = (): boolean => {
    if (!editor || editor.isDestroyed || !editor.view) return false
    editor.chain().focus().run()
    return true
  }

  const activateEditor = () => {
    setIsActivated(true)
    requestAnimationFrame(() => {
      if (focusEditorSafely()) return
      requestAnimationFrame(() => {
        focusEditorSafely()
      })
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
        style={resolvedMinHeight ? { minHeight: resolvedMinHeight } : undefined}
        className={cn(
          "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-500 transition-colors hover:bg-slate-50",
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
      className={cn("rounded-md border border-slate-200 bg-white", className)}
      onClick={focusEditorSafely}
    >
      {showToolbar && (
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 p-1.5">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("bold") ? activeToolbarButtonClassName : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-4 w-4" strokeWidth={1} />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("italic") ? activeToolbarButtonClassName : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-4 w-4" strokeWidth={1} />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("underline") ? activeToolbarButtonClassName : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" strokeWidth={1} />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("strike") ? activeToolbarButtonClassName : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" strokeWidth={1} />
        </button>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("heading", { level: 1 })
              ? activeToolbarButtonClassName
              : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" strokeWidth={1} />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("heading", { level: 2 })
              ? activeToolbarButtonClassName
              : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" strokeWidth={1} />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("heading", { level: 3 })
              ? activeToolbarButtonClassName
              : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" strokeWidth={1} />
        </button>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("bulletList") ? activeToolbarButtonClassName : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="h-4 w-4" strokeWidth={1} />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("orderedList") ? activeToolbarButtonClassName : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" strokeWidth={1} />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("taskList") ? activeToolbarButtonClassName : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          title="Checklist"
        >
          <ListChecks className="h-4 w-4" strokeWidth={1} />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("blockquote") ? activeToolbarButtonClassName : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >
          <Quote className="h-4 w-4" strokeWidth={1} />
        </button>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("code") ? activeToolbarButtonClassName : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleCode().run()}
          title="Inline code"
        >
          <Code className="h-4 w-4" strokeWidth={1} />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("codeBlock") ? activeToolbarButtonClassName : toolbarMutedButtonClassName
          )}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          <SquareCode className="h-4 w-4" strokeWidth={1} />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            toolbarButtonClassName,
            editor?.isActive("link") ? activeToolbarButtonClassName : toolbarMutedButtonClassName
          )}
          onClick={toggleLink}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" strokeWidth={1} />
        </button>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(toolbarButtonClassName, toolbarMutedButtonClassName)}
          onClick={setColor}
          title="Clear text color"
        >
          <RemoveFormatting className="h-4 w-4" strokeWidth={1} />
        </button>
        <label
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "relative inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-transparent transition-colors",
            editor?.isActive("textColor") ? activeToolbarButtonClassName : toolbarMutedButtonClassName
          )}
          title="Pick text color"
        >
          <Palette className="h-4 w-4" strokeWidth={1} />
          <span
            className="absolute bottom-0.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full"
            style={{ backgroundColor: activeTextColor || "currentColor" }}
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
          className={cn(toolbarButtonClassName, toolbarMutedButtonClassName)}
          onClick={insertImage}
          title="Insert image"
        >
          <ImageIcon className="h-4 w-4" strokeWidth={1} />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(toolbarButtonClassName, toolbarMutedButtonClassName)}
          onClick={() =>
            editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="Insert table"
        >
          <TableIcon className="h-4 w-4" strokeWidth={1} />
        </button>
      </div>
      )}
      {inlinePanel ? <div className="px-2 pt-1">{inlinePanel}</div> : null}
      <EditorContent editor={editor} style={resolvedMinHeight ? { minHeight: resolvedMinHeight } : undefined} />
      {footer ? <div className="border-t border-slate-200 px-3 py-2">{footer}</div> : null}
    </div>
  )
}
