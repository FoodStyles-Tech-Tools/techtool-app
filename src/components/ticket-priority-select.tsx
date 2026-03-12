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
}

export function TicketPrioritySelect({
  value,
  onValueChange,
  disabled,
  className,
  triggerClassName,
}: TicketPrioritySelectProps) {
  return (
    <div className={cn("relative flex min-h-8 min-w-0 items-center", className)}>
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
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
    </div>
  )
}
