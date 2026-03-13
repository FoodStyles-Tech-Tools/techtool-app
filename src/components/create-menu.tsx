"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@client/components/ui/button"

interface CreateMenuProps {
  canCreateTicket: boolean
  canCreateProject: boolean
  onCreateTicket: () => void
  onCreateProject: () => void
}

export function CreateMenu({
  canCreateTicket,
  canCreateProject,
  onCreateTicket,
  onCreateProject,
}: CreateMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isInputElement =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)

      if (isInputElement) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === "c") {
        if (!canCreateTicket && !canCreateProject) return
        event.preventDefault()
        setOpen(true)
        return
      }

      if (!open) return

      if (key === "t" && canCreateTicket) {
        event.preventDefault()
        onCreateTicket()
        setOpen(false)
      } else if (key === "p" && canCreateProject) {
        event.preventDefault()
        onCreateProject()
        setOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [open, canCreateTicket, canCreateProject, onCreateTicket, onCreateProject])

  if (!canCreateTicket && !canCreateProject) {
    return null
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        size="sm"
        className="h-9 px-3"
        onClick={() => setOpen((prev) => !prev)}
      >
        + Create
      </Button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-40 rounded-md border border-border bg-popover py-1 text-sm shadow-lg">
          {canCreateTicket ? (
            <button
              type="button"
              className="flex w-full items-center px-3 py-1.5 text-left hover:bg-accent"
              onClick={() => {
                onCreateTicket()
                setOpen(false)
              }}
            >
              Ticket
            </button>
          ) : null}
          {canCreateProject ? (
            <button
              type="button"
              className="flex w-full items-center px-3 py-1.5 text-left hover:bg-accent"
              onClick={() => {
                onCreateProject()
                setOpen(false)
              }}
            >
              Project
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

