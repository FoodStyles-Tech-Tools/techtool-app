"use client"

import { selectStyleInputSm } from "@client/lib/form-styles"
import { cn } from "@client/lib/utils"
import { PriorityPill } from "@client/components/tickets/priority-pill"

interface TicketPrioritySelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  triggerClassName?: string
  /** When true, hide the native select and show a small loading indicator instead. */
  isLoading?: boolean
}

export function TicketPrioritySelect({
  value,
  onValueChange,
  disabled,
  className,
  triggerClassName,
  isLoading = false,
}: TicketPrioritySelectProps) {
  const options = [
    { value: "high", label: "High" },
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "urgent", label: "Urgent" },
  ].sort((a, b) => a.label.localeCompare(b.label))

  return (
    <div className={cn("relative flex min-h-8 w-[120px] min-w-[120px] items-center", className)}>
      {isLoading ? (
        <div className="flex w-full items-center justify-center">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-[2px] border-muted-foreground/30 border-t-muted-foreground" />
        </div>
      ) : (
        <>
          {value ? (
            <PriorityPill priority={value} className="pointer-events-none shrink-0" />
          ) : (
            <span className="pointer-events-none text-xs text-muted-foreground">Priority</span>
          )}
          <select
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            disabled={disabled}
            className={cn(selectStyleInputSm, "absolute inset-0 cursor-pointer opacity-0", triggerClassName)}
            aria-label="Priority"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  )
}
