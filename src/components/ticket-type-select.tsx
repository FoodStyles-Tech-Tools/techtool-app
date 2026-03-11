"use client"

import { selectStyleInputSm } from "@client/lib/form-styles"
import { cn } from "@client/lib/utils"

interface TicketTypeSelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  triggerClassName?: string
}

export function TicketTypeSelect({
  value,
  onValueChange,
  disabled,
  className,
  triggerClassName,
}: TicketTypeSelectProps) {
  const resolvedValue = value || "task"

  return (
    <select
      value={resolvedValue}
      onChange={(event) => onValueChange(event.target.value)}
      disabled={disabled}
      className={cn(selectStyleInputSm, "capitalize", className, triggerClassName)}
    >
      <option value="bug">Bug</option>
      <option value="request">Request</option>
      <option value="task">Task</option>
      <option value="subtask">Subtask</option>
    </select>
  )
}
