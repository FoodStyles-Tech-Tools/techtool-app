"use client"

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
      className={cn(
        "h-8 w-full rounded-md border border-slate-300 bg-white px-3 text-sm capitalize text-slate-900 outline-none transition-colors focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50",
        className,
        triggerClassName,
      )}
    >
      <option value="bug">Bug</option>
      <option value="request">Request</option>
      <option value="task">Task</option>
      <option value="subtask">Subtask</option>
    </select>
  )
}
