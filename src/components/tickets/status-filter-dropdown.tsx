"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDownIcon } from "@heroicons/react/20/solid"
import { Checkbox } from "@client/components/ui/checkbox"
import { StatusPill } from "@client/components/tickets/status-pill"
import { normalizeStatusKey } from "@shared/ticket-statuses"
import { cn } from "@client/lib/utils"

export interface StatusFilterDropdownOption {
  id: string
  label: string
}

export interface StatusFilterDropdownProps {
  id?: string
  statusOptions: StatusFilterDropdownOption[]
  excludedStatuses: string[]
  toggleStatusExcluded: (statusKey: string) => void
  statusMap?: Map<string, { label: string; color: string }>
}

/** Multi-select status filter: same as tickets page. Checked = included, unchecked = excluded. */
export function StatusFilterDropdown({
  id = "tickets-filter-status",
  statusOptions,
  excludedStatuses,
  toggleStatusExcluded,
  statusMap,
}: StatusFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const summaryText =
    excludedStatuses.length === 0
      ? "All statuses"
      : excludedStatuses.length === statusOptions.length
        ? "None"
        : `${statusOptions.length - excludedStatuses.length} of ${statusOptions.length}`

  return (
    <div className="relative min-w-[140px]" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-form-bg px-3 py-1.5 text-sm text-foreground hover:bg-accent/50",
          open && "ring-2 ring-ring ring-offset-2 ring-offset-background"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        id={id}
      >
        <span className="truncate">{summaryText}</span>
        <ChevronDownIcon
          className={cn("ml-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-56 min-w-full overflow-y-auto rounded-md border border-border bg-card py-1 shadow-lg"
          role="listbox"
        >
          {statusOptions.map((status) => {
            const isExcluded = excludedStatuses.includes(status.id.toLowerCase())
            const isIncluded = !isExcluded
            return (
              <label
                key={status.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent/50"
              >
                <Checkbox
                  checked={isIncluded}
                  onChange={() => toggleStatusExcluded(status.id)}
                  label=""
                  aria-label={`Include ${status.label}`}
                />
                {statusMap ? (
                  <StatusPill
                    label={status.label}
                    color={statusMap.get(normalizeStatusKey(status.id))?.color ?? "#9ca3af"}
                    className="shrink-0"
                  />
                ) : (
                  <span>{status.label}</span>
                )}
              </label>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
