"use client"

import { useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write a description...",
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Underline,
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
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "tiptap",
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
      editor.commands.setContent(value || "", false)
    }
  }, [editor, value])

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

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <div className="flex flex-wrap gap-1 border-b p-2">
        <button
          type="button"
          className={cn(
            "rounded-md px-2 py-1 text-xs transition-colors",
            editor?.isActive("bold") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-2 py-1 text-xs transition-colors",
            editor?.isActive("italic") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-2 py-1 text-xs transition-colors",
            editor?.isActive("underline") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-2 py-1 text-xs transition-colors",
            editor?.isActive("strike") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          className={cn(
            "rounded-md px-2 py-1 text-xs transition-colors",
            editor?.isActive("bulletList") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-2 py-1 text-xs transition-colors",
            editor?.isActive("orderedList") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-2 py-1 text-xs transition-colors",
            editor?.isActive("blockquote") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-2 py-1 text-xs transition-colors",
            editor?.isActive("code") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <Code className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          className={cn(
            "rounded-md px-2 py-1 text-xs transition-colors",
            editor?.isActive("link") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent"
          )}
          onClick={toggleLink}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
          onClick={() =>
            editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <TableIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
