"use client"

import { cn } from "@client/lib/utils"

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
    <select
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      disabled={disabled}
      className={cn(
        "h-8 w-full rounded-md border border-slate-300 bg-white px-3 text-xs capitalize text-slate-900 outline-none transition-colors focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50",
        className,
        triggerClassName,
      )}
    >
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="urgent">Urgent</option>
    </select>
  )
}
