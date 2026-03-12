"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Input } from "@client/components/ui/input"
import { cn } from "@client/lib/utils"
import {
  PlusCircleIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  BuildingOffice2Icon,
  TicketIcon,
  FolderIcon,
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/20/solid"

export type CommandPaletteAction = {
  id: string
  label: string
  keywords?: string
  icon?: "ticket" | "project" | "epic" | "department" | "sprint" | "find-ticket" | "find-project" | "open"
}

const iconMap = {
  ticket: TicketIcon,
  project: FolderIcon,
  epic: Squares2X2Icon,
  department: BuildingOffice2Icon,
  sprint: CalendarDaysIcon,
  "find-ticket": MagnifyingGlassIcon,
  "find-project": MagnifyingGlassIcon,
  open: ArrowTopRightOnSquareIcon,
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: CommandPaletteAction[]
  onSelect: (actionId: string) => void
}

export function CommandPalette({ open, onOpenChange, actions, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        (a.keywords && a.keywords.toLowerCase().includes(q))
    )
  }, [actions, query])

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (filtered.length ? Math.min(prev + 1, filtered.length - 1) : 0))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (filtered.length ? Math.max(prev - 1, 0) : 0))
      } else if (e.key === "Enter") {
        const action = filtered[selectedIndex]
        if (action) {
          e.preventDefault()
          onSelect(action.id)
          onOpenChange(false)
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        onOpenChange(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [open, filtered, selectedIndex, onSelect, onOpenChange])

  // Scroll selected item into view
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [open, selectedIndex])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-foreground/60 transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="Command palette"
        className="fixed left-1/2 top-[20%] z-[101] w-full max-w-xl -translate-x-1/2 rounded-lg border border-border bg-card shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search commands…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            autoComplete="off"
          />
        </div>
        <div
          ref={listRef}
          className="max-h-[min(60vh,400px)] overflow-y-auto py-1"
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No commands match.
            </div>
          ) : (
            filtered.map((action, index) => {
              const Icon = action.icon ? iconMap[action.icon] : PlusCircleIcon
              return (
                <button
                  key={action.id}
                  type="button"
                  data-index={index}
                  onClick={() => {
                    onSelect(action.id)
                    onOpenChange(false)
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span>{action.label}</span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
