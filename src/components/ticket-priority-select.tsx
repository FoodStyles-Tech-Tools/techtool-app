"use client"

import { selectStyleInputSm } from "@client/lib/form-styles"
import { cn } from "@client/lib/utils"
import { PriorityPill } from "@client/components/tickets/priority-pill"
import { LoadingIndicator } from "@client/components/ui/loading-indicator"

interface TicketPrioritySelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  hideNativeSelect?: boolean
  className?: string
  triggerClassName?: string
  /** When true, hide the native select and show a small loading indicator instead. */
  isLoading?: boolean
}

export function TicketPrioritySelect({
  value,
  onValueChange,
  disabled,
  hideNativeSelect = false,
  className,
  triggerClassName,
  isLoading = false,
}: TicketPrioritySelectProps) {
  const options = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ]

  return (
    <div className={cn("relative flex min-h-8 w-[120px] min-w-[120px] items-center", className)}>
      {isLoading ? (
        <div className="flex w-full items-center justify-center">
          <LoadingIndicator size="xs" label="Updating priority…" />
        </div>
      ) : (
        <>
          {value ? (
            <PriorityPill priority={value} className="pointer-events-none shrink-0" />
          ) : (
            <span className="pointer-events-none text-xs text-muted-foreground">Priority</span>
          )}
          {!hideNativeSelect ? (
            <select
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              disabled={disabled}
              className={cn(
                selectStyleInputSm,
                "absolute inset-0 cursor-pointer opacity-0",
                triggerClassName
              )}
              aria-label="Priority"
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
        </>
      )}
    </div>
  )
}
